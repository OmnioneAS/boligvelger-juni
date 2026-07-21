'use client';

import { useEffect } from 'react';

// Standalone unit page equivalent of the resize sync WidgetClient does for
// the main embed — needed so embed.js can size the WordPress iframe to fit.
export default function EmbedResizeSync({ slug }: { slug: string }) {
  useEffect(() => {
    const send = () =>
      window.parent.postMessage(
        { type: 'bv:resize', slug, height: document.documentElement.scrollHeight },
        '*',
      );
    send();
    const ro = new ResizeObserver(send);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [slug]);

  return null;
}
