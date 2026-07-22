'use client';

import { useEffect } from 'react';
import type { Apartment, Project } from '@/lib/types';
import { resolveLabel } from '@/lib/config-defaults';
import { track } from '@/lib/analytics';
import ImageGallery from './ImageGallery';

const FIELD_KEYS = [
  'price', 'size', 'bra', 'primary_room', 'rooms', 'floor',
  'balcony', 'parking', 'view_direction', 'energy_rating',
  'ownership_type', 'monthly_cost', 'total_price',
  'collective_debt', 'property_type', 'completion_year', 'description',
] as const;

type Props = {
  apartment: Apartment;
  project: Project;
  // 'modal' shows short_description (DetailModal); 'standalone' shows the
  // full description (the /embed/[slug]/[unitId] page).
  variant: 'modal' | 'standalone';
  onClose?: () => void;
};

function formatViewingDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('nb-NO', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ApartmentDetailContent({ apartment, project, variant, onClose }: Props) {
  const cta = apartment.cta_override ?? project.cta_config;
  const visibleFields = new Set(project.visible_fields);
  const hasUpcomingViewing =
    apartment.viewing_date && new Date(apartment.viewing_date) > new Date();

  useEffect(() => {
    track('apartment_view', { unit_id: apartment.unit_id });
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [apartment.unit_id, onClose]);

  const handleCta = () => {
    track('cta_click', { unit_id: apartment.unit_id, cta_type: cta.type });
    if (cta.type === 'link' && cta.url) window.open(cta.url, '_blank', 'noopener');
    if (cta.type === 'email' && cta.url) {
      window.location.href = `mailto:${cta.url}?subject=${encodeURIComponent(apartment.title || apartment.unit_id)}`;
    }
    if (cta.type === 'phone' && cta.url) window.location.href = `tel:${cta.url}`;
  };

  return (
    <>
      {/* Gallery */}
      {project.gallery_config.show_in_modal && apartment.images.length > 0 && (
        <div className="p-4 pb-0">
          <ImageGallery images={apartment.images} />
        </div>
      )}

      <div className="p-5 flex flex-col gap-4">
        {/* Title + status */}
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-zinc-900">
              {apartment.title || apartment.unit_id}
            </h2>
            <span className="text-sm text-zinc-500 font-mono">{apartment.unit_id}</span>
          </div>
          {(() => {
            const status = project.statuses.find((s) => s.key === apartment.status);
            return status ? (
              <span
                className="mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: status.stroke }}
              >
                {resolveLabel(project.labels, status.label_key)}
              </span>
            ) : null;
          })()}
        </div>

        {/* Field grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {FIELD_KEYS.filter((k) => visibleFields.has(k)).map((key) => {
            const val = apartment[key as keyof Apartment] as string | undefined;
            if (!val) return null;
            if (key === 'description') return null; // description gets its own block
            return (
              <div key={key}>
                <div className="text-xs text-zinc-400">
                  {resolveLabel(project.labels, `field_${key}`)}
                </div>
                <div className="text-sm font-medium text-zinc-800">{val}</div>
              </div>
            );
          })}
        </div>

        {/* Description — short_description in the modal, full description on the standalone page */}
        {variant === 'modal'
          ? apartment.short_description && (
              <div>
                <div className="text-xs text-zinc-400 mb-1">
                  {resolveLabel(project.labels, 'field_short_description')}
                </div>
                <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">
                  {apartment.short_description}
                </p>
              </div>
            )
          : visibleFields.has('description') && apartment.description && (
              <div>
                <div className="text-xs text-zinc-400 mb-1">
                  {resolveLabel(project.labels, 'field_description')}
                </div>
                <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">
                  {apartment.description}
                </p>
              </div>
            )}

        {/* Upcoming viewing */}
        {hasUpcomingViewing && (
          <div className="border border-blue-100 bg-blue-50 rounded-lg px-4 py-3">
            <div className="text-xs font-semibold text-blue-700 mb-0.5">
              {resolveLabel(project.labels, 'viewing_label')}
            </div>
            <div className="text-sm text-blue-900 font-medium">
              {formatViewingDate(apartment.viewing_date!)}
            </div>
            {apartment.viewing_note && (
              <div className="text-xs text-blue-600 mt-0.5">{apartment.viewing_note}</div>
            )}
          </div>
        )}

        {/* CTA */}
        {cta.url && (
          <button
            onClick={handleCta}
            className="w-full py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-700 transition-colors"
          >
            {resolveLabel(project.labels, cta.label_key)}
          </button>
        )}
      </div>
    </>
  );
}
