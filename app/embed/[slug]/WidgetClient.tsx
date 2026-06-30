'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Project, Apartment } from '@/lib/types';
import { useActiveView } from '@/lib/useActiveView';
import { resolveLabel } from '@/lib/config-defaults';
import { track } from '@/lib/analytics';
import { buildStatusRules } from './FilterBar';
import ViewSwitcher from './ViewSwitcher';
import ImageCanvas from './ImageCanvas';
import FilterBar from './FilterBar';
import CardList from './CardList';
import DetailModal from './DetailModal';
import PromoPopup from './PromoPopup';

type Props = {
  project: Project;
  apartments: Apartment[];
};

export default function WidgetClient({ project, apartments }: Props) {
  const activeViewHook = useActiveView(project.views);
  const [hoveredUnitId, setHoveredUnitId] = useState<string | null>(null);
  const [polygonHoveredUnitId, setPolygonHoveredUnitId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [activeRuleId, setActiveRuleId] = useState('all');
  const [popupKey, setPopupKey] = useState(0);

  const triggerPopup = useCallback(() => {
    sessionStorage.removeItem(`bv:popup_seen:${project.slug}`);
    setPopupKey(k => k + 1);
  }, [project.slug]);

  const filterRules = buildStatusRules(project);
  const activeFilter = filterRules.find((r) => r.id === activeRuleId) ?? filterRules[0];

  // Track widget load
  useEffect(() => {
    track('widget_load', { slug: project.slug });
  }, [project.slug]);

  // Sync active view to URL param (?view=front) for deep linking
  useEffect(() => {
    if (!activeViewHook.activeViewKey) return;
    const url = new URL(window.location.href);
    url.searchParams.set('view', activeViewHook.activeViewKey);
    window.history.replaceState(null, '', url.toString());
  }, [activeViewHook.activeViewKey]);

  // PostMessage height to parent page (for embed.js iframe sizing)
  useEffect(() => {
    const send = () =>
      window.parent.postMessage(
        { type: 'bv:resize', slug: project.slug, height: document.documentElement.scrollHeight },
        '*',
      );
    send();
    const ro = new ResizeObserver(send);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [project.slug]);

  const handleViewSwitch = useCallback(
    (key: string) => {
      activeViewHook.setActiveViewKey(key);
      track('view_switch', { view: key });
    },
    [activeViewHook],
  );

  const handlePolygonHover = useCallback((unitId: string | null) => {
    setHoveredUnitId(unitId);
    setPolygonHoveredUnitId(unitId);
  }, []);

  const handleCardHover = useCallback((unitId: string | null) => {
    setHoveredUnitId(unitId);
    setPolygonHoveredUnitId(null);
  }, []);

  const handleSelect = useCallback(
    (unitId: string) => {
      const apt = apartments.find((a) => a.unit_id === unitId);
      if (!apt) return;
      const status = project.statuses.find((s) => s.key === apt.status);
      if (status && !status.clickable) return;
      setSelectedUnitId(unitId);
      track('apartment_click', { unit_id: unitId });
    },
    [apartments, project.statuses],
  );

  const handleFilterChange = useCallback(
    (id: string) => {
      setActiveRuleId(id);
      track('filter_change', { filter: id });
    },
    [],
  );

  const selectedApartment = apartments.find((a) => a.unit_id === selectedUnitId) ?? null;

  return (
    <>
    <div className="bv-root min-h-screen bg-white">
      <div className="bv-layout">
        {/* Canvas column */}
        <div className="bv-col-canvas flex flex-col">
          <ViewSwitcher
            project={{ ...project, views: project.views }}
            activeViewHook={{ ...activeViewHook, setActiveViewKey: handleViewSwitch }}
          />
          <ImageCanvas
            apartments={apartments}
            project={project}
            activeViewHook={activeViewHook}
            hoveredUnitId={hoveredUnitId}
            selectedUnitId={selectedUnitId}
            onHover={handlePolygonHover}
            onSelect={handleSelect}
          />
        </div>

        {/* Cards column */}
        <div className="bv-col-cards flex flex-col border-t border-zinc-100 lg:border-t-0 lg:border-l">
          <FilterBar
            rules={filterRules}
            activeRuleId={activeRuleId}
            onSelect={handleFilterChange}
          />
          <CardList
            apartments={apartments}
            project={project}
            activeViewHook={activeViewHook}
            activeFilter={activeFilter}
            hoveredUnitId={hoveredUnitId}
            polygonHoveredUnitId={polygonHoveredUnitId}
            selectedUnitId={selectedUnitId}
            onHover={handleCardHover}
            onSelect={handleSelect}
          />
        </div>
      </div>

      {/* Detail modal */}
      {selectedApartment && (
        <DetailModal
          apartment={selectedApartment}
          project={project}
          onClose={() => setSelectedUnitId(null)}
        />
      )}
    </div>

    {/* Sticky CTA + popup outside bv-root to avoid container-type positioning context */}
    <button
      onClick={triggerPopup}
      className="fixed bottom-4 right-4 z-40 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
    >
      {resolveLabel(project.labels, 'sticky_cta_label')}
    </button>

    <PromoPopup key={popupKey} project={project} apartments={apartments} noDelay={popupKey > 0} />
    </>
  );
}
