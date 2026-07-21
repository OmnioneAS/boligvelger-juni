'use client';

type Props = {
  overviewUrl: string;
  label: string;
};

// Navigates the top-level browser (not just the iframe) back to the
// overview page — mirrors how WidgetClient navigates forward via
// cta_config.detail_page_url.
export default function BackToOverviewButton({ overviewUrl, label }: Props) {
  return (
    <button
      onClick={() => { window.top!.location.href = overviewUrl; }}
      className="m-4 text-sm font-medium text-zinc-500 hover:text-zinc-800 transition-colors"
    >
      ← {label}
    </button>
  );
}
