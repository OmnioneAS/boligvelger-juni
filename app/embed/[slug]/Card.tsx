'use client';

import type { Apartment, Project } from '@/lib/types';
import { resolveLabel } from '@/lib/config-defaults';
import type { UseActiveViewReturn } from '@/lib/useActiveView';

type Props = {
  apartment: Apartment;
  project: Project;
  activeViewHook: UseActiveViewReturn;
  isHovered: boolean;
  isSelected: boolean;
  onHover: (unitId: string | null) => void;
  onSelect: (unitId: string) => void;
};

// Field keys that map to apartment data fields
const FIELD_KEYS = [
  'title', 'price', 'size', 'rooms', 'floor',
  'balcony', 'parking', 'view_direction', 'energy_rating',
  'ownership_type', 'monthly_cost', 'total_price',
] as const;

type FieldKey = typeof FIELD_KEYS[number];

function getApartmentField(apt: Apartment, key: FieldKey): string | undefined {
  return apt[key as keyof Apartment] as string | undefined;
}

export default function Card({
  apartment,
  project,
  activeViewHook,
  isHovered,
  isSelected,
  onHover,
  onSelect,
}: Props) {
  const { activeView } = activeViewHook;
  const status = project.statuses.find((s) => s.key === apartment.status);
  const visibleFields = new Set(project.visible_fields);
  const hasPolygonInView = activeView
    ? Boolean(apartment.polygons[activeView.key]?.length)
    : false;

  const active = isHovered || isSelected;

  return (
    <div
      data-unit-id={apartment.unit_id}
      onMouseEnter={() => onHover(apartment.unit_id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(apartment.unit_id)}
      className={[
        'px-4 py-3 border-b border-zinc-100 cursor-pointer transition-colors',
        active ? 'bg-blue-50' : 'hover:bg-zinc-50',
        isSelected ? 'border-l-2 border-l-blue-500' : '',
      ].join(' ')}
    >
      {/* Header row: title + status dot */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-sm font-semibold text-zinc-900 leading-tight">
          {apartment.title || apartment.unit_id}
        </span>
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          {status && (
            <span
              className="w-2 h-2 rounded-full border border-black/10"
              style={{ backgroundColor: status.color }}
              title={resolveLabel(project.labels, status.label_key)}
            />
          )}
          {!hasPolygonInView && activeView && (
            <span className="text-[10px] text-zinc-400 italic">
              {resolveLabel(project.labels, 'switch_view_for_apartment').replace(
                '{view}',
                resolveLabel(project.labels, activeView.label_key),
              )}
            </span>
          )}
        </div>
      </div>

      {/* Visible fields */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {FIELD_KEYS.filter(
          (k) => k !== 'title' && visibleFields.has(k),
        ).map((key) => {
          const val = getApartmentField(apartment, key);
          if (!val) return null;
          return (
            <span key={key} className="text-xs text-zinc-500">
              <span className="text-zinc-400">
                {resolveLabel(project.labels, `field_${key}`)}{' '}
              </span>
              {val}
            </span>
          );
        })}
      </div>
    </div>
  );
}
