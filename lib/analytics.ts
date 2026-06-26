// Single dispatch point for all analytics events.
// Components always call track() — never gtag/fbq directly.
// Week 3: flesh out GA4 and Meta Pixel loading inside the embed iframe.

import type { AnalyticsEventName } from '@/lib/types';

declare global {
  interface Window {
    gtag?: (command: string, action: string, params: Record<string, unknown>) => void;
    fbq?: (command: string, action: string, params: Record<string, unknown>) => void;
  }
}

export function track(
  name: AnalyticsEventName,
  params: Record<string, unknown> = {},
): void {
  if (typeof window === 'undefined') return;

  if (window.gtag) {
    window.gtag('event', name, params);
  }

  if (window.fbq) {
    window.fbq('trackCustom', name, params);
  }

  // Bubble event to parent page (for GHL and other parent-side integrations).
  window.parent.postMessage({ type: 'bv:analytics', event: name, params }, '*');
}
