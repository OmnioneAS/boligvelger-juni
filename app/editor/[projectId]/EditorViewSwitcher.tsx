'use client';

import Image from 'next/image';
import type { Project } from '@/lib/types';
import { resolveLabel } from '@/lib/config-defaults';
import type { UseActiveViewReturn } from './hooks/useActiveView';

type Props = {
  project: Project;
  activeViewHook: UseActiveViewReturn;
};

export default function EditorViewSwitcher({ project, activeViewHook }: Props) {
  const { activeViewKey, setActiveViewKey } = activeViewHook;
  const sorted = [...project.views].sort((a, b) => a.order - b.order);

  if (sorted.length === 0) {
    return (
      <div className="text-xs text-zinc-400 px-1">
        No views yet — add one in Project Settings.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-zinc-500 font-medium mr-1">View:</span>
      {sorted.map((view) => {
        const isActive = view.key === activeViewKey;
        const label = resolveLabel(project.labels, view.label_key);
        return (
          <button
            key={view.key}
            onClick={() => setActiveViewKey(view.key)}
            className={[
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              'border focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
              isActive
                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                : 'bg-white border-zinc-200 text-zinc-700 hover:border-blue-300 hover:text-blue-600',
            ].join(' ')}
            aria-pressed={isActive}
          >
            {view.thumbnail_url && (
              <span className="relative w-8 h-5 rounded overflow-hidden flex-shrink-0">
                <Image
                  src={view.thumbnail_url}
                  alt={label}
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              </span>
            )}
            {label}
          </button>
        );
      })}
    </div>
  );
}
