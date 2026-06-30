'use client';

import { useState, useCallback } from 'react';
import type { Project, Apartment, ViewDefinition, PolygonPoints } from '@/lib/types';
import { useActiveView } from './hooks/useActiveView';
import EditorViewSwitcher from './EditorViewSwitcher';
import EditorCanvas from './EditorCanvas';
import EditorSidebar from './EditorSidebar';
import EditorSettings from './EditorSettings';
import EditorImageUploader from './EditorImageUploader';
import { saveApartmentFields } from '@/lib/actions';

type Props = {
  project: Project;
  apartments: Apartment[];
};

export default function EditorShell({ project, apartments: initialApartments }: Props) {
  const [currentProject, setCurrentProject] = useState<Project>(project);
  const [views, setViews] = useState<ViewDefinition[]>(project.views);
  const [apartments, setApartments] = useState<Apartment[]>(initialApartments);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const activeViewHook = useActiveView(views);

  const handleSaved = useCallback((updated: Apartment) => {
    setApartments(prev => prev.map(a => (a.id === updated.id ? updated : a)));
  }, []);

  const handleApartmentCreated = useCallback((apt: Apartment) => {
    setApartments(prev => [...prev, apt]);
    setSelectedUnitId(apt.unit_id);
  }, []);

  const handleApartmentDeleted = useCallback((id: string) => {
    setApartments(prev => prev.filter(a => a.id !== id));
    setSelectedUnitId(null);
  }, []);

  const handleViewsUpdated = useCallback((newViews: ViewDefinition[]) => {
    setViews(newViews);
    setCurrentProject(p => ({ ...p, views: newViews }));
  }, []);

  const handleProjectSaved = useCallback((updated: Project) => {
    setCurrentProject(updated);
    setViews(updated.views);
  }, []);

  const handlePolygonSaved = useCallback(
    (unitId: string, points: PolygonPoints | null) => {
      const viewKey = activeViewHook.activeViewKey;
      if (!viewKey) return;
      const apt = apartments.find(a => a.unit_id === unitId);
      if (!apt) return;

      let newPolygons: Apartment['polygons'];
      if (points === null) {
        newPolygons = { ...apt.polygons };
        delete newPolygons[viewKey];
      } else {
        newPolygons = { ...apt.polygons, [viewKey]: points };
      }

      saveApartmentFields(apt.id, { polygons: newPolygons }).then(result => {
        if (result.ok) handleSaved(result.apartment);
      });
    },
    [apartments, activeViewHook.activeViewKey, handleSaved],
  );

  const selectedApartment = apartments.find(a => a.unit_id === selectedUnitId) ?? null;
  const effectiveProject = { ...currentProject, views };

  return (
    <div className="flex flex-col gap-4 p-6 min-h-screen bg-zinc-50">
      {/* ── Header ── */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">{currentProject.name}</h1>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">/editor/{currentProject.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(v => !v)}
            className={[
              'text-xs px-3 py-1.5 rounded font-medium transition-colors',
              showSettings
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
            ].join(' ')}
          >
            Settings
          </button>
          <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-1 rounded font-mono">
            v1 editor
          </span>
        </div>
      </header>

      {showSettings ? (
        <EditorSettings
          project={effectiveProject}
          onSaved={handleProjectSaved}
          onClose={() => setShowSettings(false)}
        />
      ) : (
        <>
          {/* ── Toolbar: view switcher + image uploader ── */}
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <EditorViewSwitcher project={effectiveProject} activeViewHook={activeViewHook} />
            </div>
            <EditorImageUploader
              project={effectiveProject}
              views={views}
              activeViewHook={activeViewHook}
              onViewsUpdated={handleViewsUpdated}
            />
          </div>

          {/* ── Main area: canvas + sidebar ── */}
          <div className="flex gap-4 items-start">
            <div className="flex-1 min-w-0">
              <EditorCanvas
                apartments={apartments}
                activeViewHook={activeViewHook}
                selectedUnitId={selectedUnitId}
                onSelectUnit={setSelectedUnitId}
                onPolygonSaved={handlePolygonSaved}
              />
            </div>
            <EditorSidebar
              project={effectiveProject}
              apartments={apartments}
              apartment={selectedApartment}
              onSaved={handleSaved}
              onSelectUnit={setSelectedUnitId}
              onApartmentCreated={handleApartmentCreated}
              onApartmentDeleted={handleApartmentDeleted}
            />
          </div>
        </>
      )}
    </div>
  );
}
