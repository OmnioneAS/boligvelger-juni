'use client';

import { useCallback, useState, type CSSProperties } from 'react';
import type { Apartment, Project } from '@/lib/types';
import { resolveLabel, DEFAULT_FEATURED_CONFIG } from '@/lib/config-defaults';
import { track } from '@/lib/analytics';
import DetailModal from '../DetailModal';
import FeaturedCarousel from './FeaturedCarousel';
import FeaturedCard from './FeaturedCard';

type Props = {
  project: Project;
  featuredApartments: Apartment[];
  carouselImages: { url: string; alt: string }[];
  // Theming — see the route's comment on why these come in as query params
  // rather than literal CSS inheritance (the widget lives in a cross-origin
  // iframe; the parent page's styles can't cascade in).
  primaryColor?: string;
  fontFamily?: string;
};

const DEFAULT_PRIMARY = '#2563eb';

export default function FeaturedWidgetClient({
  project,
  featuredApartments,
  carouselImages,
  primaryColor,
  fontFamily,
}: Props) {
  const title = project.featured_config.title ?? DEFAULT_FEATURED_CONFIG.title;
  const heading = project.featured_config.heading ?? DEFAULT_FEATURED_CONFIG.heading;
  const description = project.featured_config.description ?? DEFAULT_FEATURED_CONFIG.description;
  const overviewUrl = project.cta_config.overview_url;

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const selectedApartment = featuredApartments.find((a) => a.unit_id === selectedUnitId) ?? null;

  // Same click-gating as the main widget's Card/WidgetClient: a status
  // marked non-clickable (e.g. sold) never opens the modal. In practice
  // every featured apartment is already status=available (the selection
  // logic only ever picks from available units), so this is defensive
  // consistency rather than something expected to trigger here.
  const handleSelect = useCallback(
    (unitId: string) => {
      const apt = featuredApartments.find((a) => a.unit_id === unitId);
      if (!apt) return;
      const status = project.statuses.find((s) => s.key === apt.status);
      if (status && !status.clickable) return;
      track('apartment_click', { unit_id: unitId });
      setSelectedUnitId(unitId);
    },
    [featuredApartments, project.statuses],
  );

  const rootStyle = {
    '--bv-primary': primaryColor || DEFAULT_PRIMARY,
    fontFamily: fontFamily || 'inherit',
  } as CSSProperties;

  return (
    <div className="bv-featured-root" style={rootStyle}>
      <div className="bv-featured-layout">
        <div className="bv-featured-col-carousel">
          <FeaturedCarousel images={carouselImages} />
        </div>

        <div className="bv-featured-col-content flex flex-col gap-3 py-2">
          {title && (
            <span
              className="text-xs uppercase tracking-widest text-zinc-500 font-semibold"
              style={{ fontVariantCaps: 'small-caps' }}
            >
              {title}
            </span>
          )}
          {heading && (
            <h2 className="text-2xl font-serif text-zinc-900 leading-tight">{heading}</h2>
          )}
          {description && (
            <p className="text-sm text-zinc-600 leading-relaxed">{description}</p>
          )}

          {featuredApartments.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mt-1">
              {featuredApartments.map((apt) => (
                <FeaturedCard key={apt.id} apartment={apt} project={project} onSelect={handleSelect} />
              ))}
            </div>
          )}

          {overviewUrl && (
            <button
              onClick={() => { window.top!.location.href = overviewUrl; }}
              className="mt-2 self-start px-4 py-2 rounded text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--bv-primary)' }}
            >
              {resolveLabel(project.labels, 'cta_back_to_overview')}
            </button>
          )}
        </div>
      </div>

      {selectedApartment && (
        <DetailModal
          apartment={selectedApartment}
          project={project}
          onClose={() => setSelectedUnitId(null)}
        />
      )}
    </div>
  );
}
