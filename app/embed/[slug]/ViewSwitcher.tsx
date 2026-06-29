'use client';

import type { Project } from '@/lib/types';
import type { UseActiveViewReturn } from '@/lib/useActiveView';
import { resolveLabel } from '@/lib/config-defaults';

type Props = {
  project: Project;
  activeViewHook: UseActiveViewReturn;
};

export default function ViewSwitcher({ project, activeViewHook }: Props) {
  const { activeViewKey, setActiveViewKey } = activeViewHook;

  if (project.views.length <= 1) return null;

  return (
    <div className="flex gap-1 p-2">
      {project.views
        .sort((a, b) => a.order - b.order)
        .map((view) => {
          const active = view.key === activeViewKey;
          return (
            <button
              key={view.key}
              onClick={() => setActiveViewKey(view.key)}
              className={[
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                active
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
              ].join(' ')}
            >
              {view.thumbnail_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={view.thumbnail_url}
                  alt=""
                  className="w-6 h-4 object-cover rounded-sm"
                />
              )}
              {resolveLabel(project.labels, view.label_key)}
            </button>
          );
        })}
    </div>
  );
}
