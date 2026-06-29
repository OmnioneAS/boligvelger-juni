'use client';

import type { Apartment, Project, PolygonPoints } from '@/lib/types';

type PolygonItem = {
  unitId: string;
  points: PolygonPoints;
  fill: string;
  stroke: string;
  clickable: boolean;
};

type Props = {
  apartments: Apartment[];
  project: Project;
  viewKey: string;
  hoveredUnitId: string | null;
  selectedUnitId: string | null;
  onHover: (unitId: string | null) => void;
  onSelect: (unitId: string) => void;
};

function pointsToSvg(pts: PolygonPoints): string {
  return pts.map(([x, y]) => `${x},${y}`).join(' ');
}

// Single dispatch point for all polygon SVG rendering.
// Feature code passes data; this component owns the visual output.
export default function PolygonOverlay({
  apartments,
  project,
  viewKey,
  hoveredUnitId,
  selectedUnitId,
  onHover,
  onSelect,
}: Props) {
  const statusMap = new Map(project.statuses.map((s) => [s.key, s]));

  const items: PolygonItem[] = [];
  for (const apt of apartments) {
    const pts = apt.polygons[viewKey];
    if (!pts || pts.length < 3) continue;
    const status = statusMap.get(apt.status);
    if (!status) continue;
    items.push({
      unitId: apt.unit_id,
      points: pts,
      fill: status.color,
      stroke: status.stroke,
      clickable: status.clickable,
    });
  }

  return (
    <>
      {items.map(({ unitId, points, fill, stroke, clickable }) => {
        const isHovered = unitId === hoveredUnitId;
        const isSelected = unitId === selectedUnitId;
        const active = isHovered || isSelected;

        return (
          <polygon
            key={unitId}
            data-unit-id={unitId}
            points={pointsToSvg(points)}
            fill={fill}
            stroke={stroke}
            strokeWidth={active ? 3 : 1.5}
            opacity={active ? 1 : 0.75}
            style={{
              cursor: clickable ? 'pointer' : 'default',
              pointerEvents: clickable ? 'all' : 'none',
              transition: 'opacity 0.15s ease, stroke-width 0.15s ease',
              filter: isHovered ? 'brightness(1.2)' : undefined,
            }}
            onMouseEnter={() => clickable && onHover(unitId)}
            onMouseLeave={() => onHover(null)}
            onClick={() => clickable && onSelect(unitId)}
          />
        );
      })}
    </>
  );
}
