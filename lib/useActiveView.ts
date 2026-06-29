'use client';

import { useState } from 'react';
import type { ViewDefinition } from '@/lib/types';

export type UseActiveViewReturn = {
  activeView: ViewDefinition | undefined;
  activeViewKey: string | null;
  setActiveViewKey: (key: string) => void;
};

// The single abstraction for "which view is currently selected."
// All image URL reads and polygon loads must go through this hook —
// never read project.views[i].image_url directly from feature code.
//
// Shared between the editor (app/editor/[projectId]) and the public embed
// (app/embed/[slug]).
export function useActiveView(views: ViewDefinition[]): UseActiveViewReturn {
  const defaultView = views.find((v) => v.is_default) ?? views[0];

  const [activeViewKey, setActiveViewKey] = useState<string | null>(
    defaultView?.key ?? null,
  );

  const activeView = views.find((v) => v.key === activeViewKey);

  return { activeView, activeViewKey, setActiveViewKey };
}
