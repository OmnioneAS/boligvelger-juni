'use client';

import type { Apartment, Project } from '@/lib/types';
import type { UseActiveViewReturn } from '@/lib/useActiveView';
import PolygonOverlay from './PolygonOverlay';

type Props = {
  apartments: Apartment[];
  project: Project;
  activeViewHook: UseActiveViewReturn;
  hoveredUnitId: string | null;
  selectedUnitId: string | null;
  onHover: (unitId: string | null) => void;
  onSelect: (unitId: string) => void;
};

// All image URL reads go through activeViewHook — never read image_url directly.
export default function ImageCanvas({
  apartments,
  project,
  activeViewHook,
  hoveredUnitId,
  selectedUnitId,
  onHover,
  onSelect,
}: Props) {
  const { activeView } = activeViewHook;

  if (!activeView) {
    return (
      <div className="w-full aspect-video bg-zinc-100 flex items-center justify-center text-zinc-400 text-sm">
        No image configured.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', lineHeight: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={activeView.image_url}
        alt=""
        style={{ width: '100%', display: 'block' }}
      />
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
        }}
        viewBox={`0 0 ${activeView.image_width} ${activeView.image_height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <PolygonOverlay
          apartments={apartments}
          project={project}
          viewKey={activeView.key}
          hoveredUnitId={hoveredUnitId}
          selectedUnitId={selectedUnitId}
          onHover={onHover}
          onSelect={onSelect}
        />
      </svg>
    </div>
  );
}
