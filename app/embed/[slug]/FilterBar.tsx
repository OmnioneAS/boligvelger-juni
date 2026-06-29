'use client';

import type { Apartment, Project } from '@/lib/types';
import { resolveLabel } from '@/lib/config-defaults';

// Rule-based architecture: extend this type to add price/size/rooms filters later
// without changing how FilterBar or CardList consume filters.
export type FilterRule = {
  id: string;
  label: string;
  predicate: (apt: Apartment) => boolean;
};

export function buildStatusRules(project: Project): FilterRule[] {
  return [
    {
      id: 'all',
      label: resolveLabel(project.labels, 'filter_all'),
      predicate: () => true,
    },
    ...project.statuses
      .filter((s) => s.show_in_filter)
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        id: s.key,
        label: resolveLabel(project.labels, s.label_key),
        predicate: (apt: Apartment) => apt.status === s.key,
      })),
  ];
}

type Props = {
  rules: FilterRule[];
  activeRuleId: string;
  onSelect: (id: string) => void;
};

export default function FilterBar({ rules, activeRuleId, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5 px-3 py-2">
      {rules.map((rule) => {
        const active = rule.id === activeRuleId;
        return (
          <button
            key={rule.id}
            onClick={() => onSelect(rule.id)}
            className={[
              'px-3 py-1 rounded-full text-sm font-medium transition-colors',
              active
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
            ].join(' ')}
          >
            {rule.label}
          </button>
        );
      })}
    </div>
  );
}
