'use client';

// Thin client wrapper that owns the shared useActiveView state and passes it
// down to EditorViewSwitcher and EditorCanvas. The server page renders this
// component with serialised project + apartments data.

import type { Project, Apartment } from '@/lib/types';
import { useActiveView } from './hooks/useActiveView';
import EditorViewSwitcher from './EditorViewSwitcher';
import EditorCanvas from './EditorCanvas';

type Props = {
  project: Project;
  apartments: Apartment[];
};

export default function EditorShell({ project, apartments }: Props) {
  const activeViewHook = useActiveView(project.views);

  return (
    <div className="flex flex-col gap-4 p-6 min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">{project.name}</h1>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            /editor/{project.id}
          </p>
        </div>
        <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-1 rounded font-mono">
          v1 editor
        </span>
      </header>

      {/* View switcher */}
      <EditorViewSwitcher project={project} activeViewHook={activeViewHook} />

      {/* Canvas */}
      <EditorCanvas
        apartments={apartments}
        activeViewHook={activeViewHook}
      />

      {/* Apartment list (read-only in v1 — sidebar form comes later in Week 1) */}
      {apartments.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-600 mb-2">
            Apartments ({apartments.length})
          </h2>
          <div className="flex flex-col gap-1">
            {apartments
              .sort((a, b) => a.display_order - b.display_order)
              .map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center gap-3 px-3 py-2 bg-white rounded border border-zinc-100 text-sm"
                >
                  <span className="font-mono text-xs text-zinc-400 w-16 shrink-0">
                    {apt.unit_id}
                  </span>
                  <span className="font-medium text-zinc-800">{apt.title}</span>
                  <span className="text-zinc-400">
                    {apt.price ?? '—'} · {apt.size ?? '—'}
                  </span>
                  <span className="ml-auto text-xs text-zinc-400">
                    {apt.status}
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
