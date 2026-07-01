'use client';

import { useState, useEffect } from 'react';
import type { Apartment, Project } from '@/lib/types';
import { resolveLabel } from '@/lib/config-defaults';
import { track } from '@/lib/analytics';

type Props = {
  project: Project;
  apartments: Apartment[];
  noDelay?: boolean;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
}

export default function PromoPopup({ project, apartments, noDelay }: Props) {
  const [visible, setVisible] = useState(false);
  const cfg = project.popup_config;

  useEffect(() => {
    if (!cfg.enabled) return;
    const sessionKey = `bv:popup_seen:${project.slug}`;
    if (!noDelay && cfg.show_once_per_session && sessionStorage.getItem(sessionKey)) return;

    const t = setTimeout(() => {
      setVisible(true);
      track('popup_shown', { slug: project.slug });
    }, noDelay ? 0 : cfg.delay_ms);

    return () => clearTimeout(t);
  }, [cfg, project.slug]);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem(`bv:popup_seen:${project.slug}`, '1');
    track('popup_dismissed', { slug: project.slug });
  };

  if (!visible) return null;

  // Find earliest upcoming viewing
  const nextViewing = apartments
    .filter((a) => a.viewing_date && new Date(a.viewing_date) > new Date())
    .sort((a, b) => new Date(a.viewing_date!).getTime() - new Date(b.viewing_date!).getTime())[0];

  const hasViewing = Boolean(nextViewing);
  const content = hasViewing ? cfg.when_viewing_scheduled : cfg.when_no_viewing;

  let body = '';
  if (hasViewing && 'body_template' in content) {
    body = content.body_template
      .replace('{date}', formatDate(nextViewing!.viewing_date!))
      .replace('{time}', formatTime(nextViewing!.viewing_date!))
      .replace('{apartment_title}', nextViewing?.title || nextViewing?.unit_id || '');
  }

  const ctaUrl = content.cta_url;
  const ctaLabel = resolveLabel(project.labels, content.cta_label_key);
  const title = resolveLabel(project.labels, content.title_key);

  const handleCta = () => {
    track('popup_cta_click', { slug: project.slug });
    if (ctaUrl) window.open(ctaUrl, '_blank', 'noopener');
    dismiss();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center pointer-events-none">
      <div
        className="pointer-events-auto bg-white w-full rounded-t-2xl sm:rounded-2xl sm:max-w-sm shadow-2xl p-5 flex flex-col gap-3"
        style={{ animation: 'slideUp 0.25s ease' }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-zinc-900">{title}</p>
          {cfg.dismissible && (
            <button
              onClick={dismiss}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 text-xs shrink-0"
            >
              ✕
            </button>
          )}
        </div>
        {body && <p className="text-sm text-zinc-600">{body}</p>}
        {ctaUrl && (
          <button
            onClick={handleCta}
            className="w-full py-2 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-700 transition-colors"
          >
            {ctaLabel}
          </button>
        )}
      </div>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
