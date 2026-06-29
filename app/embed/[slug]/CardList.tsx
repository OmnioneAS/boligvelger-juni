'use client';

import type { Apartment, Project } from '@/lib/types';
import type { UseActiveViewReturn } from '@/lib/useActiveView';
import type { FilterRule } from './FilterBar';
import { resolveLabel } from '@/lib/config-defaults';
import Card from './Card';

type Props = {
  apartments: Apartment[];
  project: Project;
  activeViewHook: UseActiveViewReturn;
  activeFilter: FilterRule;
  hoveredUnitId: string | null;
  selectedUnitId: string | null;
  onHover: (unitId: string | null) => void;
  onSelect: (unitId: string) => void;
};

export default function CardList({
  apartments,
  project,
  activeViewHook,
  activeFilter,
  hoveredUnitId,
  selectedUnitId,
  onHover,
  onSelect,
}: Props) {
  const filtered = apartments.filter(activeFilter.predicate);

  if (filtered.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-zinc-400">
        {resolveLabel(project.labels, 'no_apartments_match')}
      </div>
    );
  }

  return (
    <div>
      {filtered.map((apt) => (
        <Card
          key={apt.id}
          apartment={apt}
          project={project}
          activeViewHook={activeViewHook}
          isHovered={apt.unit_id === hoveredUnitId}
          isSelected={apt.unit_id === selectedUnitId}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
