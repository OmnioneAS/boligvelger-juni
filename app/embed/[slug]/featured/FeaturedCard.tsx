'use client';

import type { Apartment, Project } from '@/lib/types';
import { resolveLabel } from '@/lib/config-defaults';

type Props = {
  apartment: Apartment;
  project: Project;
  onSelect: (unitId: string) => void;
};

const TRUNCATE_LENGTH = 60;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}...` : text;
}

export default function FeaturedCard({ apartment, project, onSelect }: Props) {
  const detailPageUrl = project.cta_config.detail_page_url;

  return (
    <div
      onClick={() => onSelect(apartment.unit_id)}
      className="flex flex-col gap-1.5 p-3 rounded-lg border border-zinc-100 bg-white cursor-pointer hover:bg-zinc-50 transition-colors"
    >
      <span className="text-sm font-semibold text-zinc-900 leading-tight">
        {apartment.title || apartment.unit_id}
      </span>
      {apartment.rooms && (
        <span className="text-xs text-zinc-500">
          <span className="text-zinc-400">{resolveLabel(project.labels, 'field_rooms')} </span>
          {apartment.rooms}
        </span>
      )}
      {apartment.short_description && (
        <p className="text-xs text-zinc-600 leading-relaxed">
          {truncate(apartment.short_description, TRUNCATE_LENGTH)}
        </p>
      )}
      {detailPageUrl && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.top!.location.href = detailPageUrl.replace('{unitId}', apartment.unit_id);
          }}
          className="mt-1 self-start text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          {resolveLabel(project.labels, 'cta_view_full_page')} →
        </button>
      )}
    </div>
  );
}
