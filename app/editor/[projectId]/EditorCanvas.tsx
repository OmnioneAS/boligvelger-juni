'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Circle, Text } from 'react-konva';
import useImage from 'use-image';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Apartment, PolygonPoints } from '@/lib/types';
import type { UseActiveViewReturn } from './hooks/useActiveView';

// ── Types ────────────────────────────────────────────────────────────────────

type ClosedPolygon = {
  points: PolygonPoints;
  // In v1 these are draw-order polygons with no apartment assignment.
  // Week 2 will tie each polygon to an apartment unit_id.
  unitId: string | null;
};

type Props = {
  apartments: Apartment[];
  activeViewHook: UseActiveViewReturn;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

// Flatten [[x,y], ...] to [x, y, x, y, ...] for Konva's points prop
function flattenPoints(pts: PolygonPoints): number[] {
  return pts.flatMap(([x, y]) => [x, y]);
}

const MIN_VERTICES_TO_CLOSE = 3;
// Visual snap radius in image-space pixels (not screen pixels)
const CLOSE_SNAP_RADIUS_IMG = 12;

// ── Background image with CORS (required for canvas cross-origin sources) ────

function BackgroundImage({
  src,
  width,
  height,
}: {
  src: string;
  width: number;
  height: number;
}) {
  const [image] = useImage(src, 'anonymous');
  return <KonvaImage image={image} x={0} y={0} width={width} height={height} />;
}

// ── Main component ───────────────────────────────────────────────────────────

export default function EditorCanvas({ apartments, activeViewHook }: Props) {
  const { activeView } = activeViewHook;

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Polygon drawing state
  const [draftPoints, setDraftPoints] = useState<PolygonPoints>([]);
  const [closedPolygons, setClosedPolygons] = useState<ClosedPolygon[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Measure container width via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setContainerWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Seed closed polygons from existing apartment data when view changes
  useEffect(() => {
    if (!activeView) return;
    const existing: ClosedPolygon[] = [];
    for (const apt of apartments) {
      const pts = apt.polygons[activeView.key];
      if (pts && pts.length >= MIN_VERTICES_TO_CLOSE) {
        existing.push({ points: pts, unitId: apt.unit_id });
      }
    }
    setClosedPolygons(existing);
    setDraftPoints([]);
    setIsDrawing(false);
  }, [activeView, apartments]);

  // Close polygon on Enter key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') closePolygon();
      if (e.key === 'Escape') cancelDraft();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const closePolygon = useCallback(() => {
    if (draftPoints.length < MIN_VERTICES_TO_CLOSE) return;
    setClosedPolygons((prev) => [...prev, { points: draftPoints, unitId: null }]);
    setDraftPoints([]);
    setIsDrawing(false);
  }, [draftPoints]);

  const cancelDraft = useCallback(() => {
    setDraftPoints([]);
    setIsDrawing(false);
  }, []);

  if (!activeView) {
    return (
      <div className="flex items-center justify-center h-96 bg-zinc-100 rounded-lg text-zinc-500 text-sm">
        No view selected. Add a view image in Project Settings.
      </div>
    );
  }

  if (containerWidth === 0) {
    return <div ref={containerRef} className="w-full h-96 bg-zinc-100 rounded-lg" />;
  }

  // Scale so that 1 Konva unit = 1 image pixel.
  // The stage renders at containerWidth; polygons are stored in image coords.
  const scale = containerWidth / activeView.image_width;
  const stageHeight = activeView.image_height * scale;

  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    // Ignore right-clicks
    if (e.evt.button !== 0) return;

    const stage = e.target.getStage();
    if (!stage) return;

    // getRelativePointerPosition accounts for stage scale → image coords
    const pos = stage.getRelativePointerPosition();
    if (!pos) return;

    const imgX = pos.x;
    const imgY = pos.y;

    // Snap-close: if click is within CLOSE_SNAP_RADIUS_IMG of the first vertex
    if (
      isDrawing &&
      draftPoints.length >= MIN_VERTICES_TO_CLOSE
    ) {
      const [fx, fy] = draftPoints[0];
      const dist = Math.hypot(imgX - fx, imgY - fy);
      if (dist <= CLOSE_SNAP_RADIUS_IMG) {
        closePolygon();
        return;
      }
    }

    setDraftPoints((prev) => [...prev, [imgX, imgY]]);
    setIsDrawing(true);
  };

  const handleStageDblClick = () => {
    closePolygon();
  };

  // First vertex indicator color
  const firstVertex = draftPoints[0];

  return (
    <div className="flex flex-col gap-3">
      {/* Status bar */}
      <div className="flex items-center gap-4 text-xs text-zinc-500 font-mono">
        {isDrawing ? (
          <>
            <span className="text-blue-600 font-semibold">Drawing…</span>
            <span>{draftPoints.length} vertices</span>
            <span>Double-click or Enter to close · Esc to cancel</span>
          </>
        ) : (
          <span>Click on the image to start drawing a polygon</span>
        )}
        {closedPolygons.length > 0 && (
          <span className="ml-auto">{closedPolygons.length} polygon{closedPolygons.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100"
        style={{ height: containerWidth > 0 ? stageHeight : 400, cursor: isDrawing ? 'crosshair' : 'default' }}
      >
        <Stage
          width={containerWidth}
          height={stageHeight}
          scaleX={scale}
          scaleY={scale}
          onClick={handleStageClick}
          onDblClick={handleStageDblClick}
        >
          {/* Layer 1: background image */}
          <Layer>
            <BackgroundImage
              src={activeView.image_url}
              width={activeView.image_width}
              height={activeView.image_height}
            />
          </Layer>

          {/* Layer 2: closed polygons */}
          <Layer>
            {closedPolygons.map((poly, i) => (
              <Line
                key={i}
                points={flattenPoints(poly.points)}
                closed
                fill="rgba(59, 130, 246, 0.25)"
                stroke="#2563eb"
                strokeWidth={2 / scale}
                lineCap="round"
                lineJoin="round"
              />
            ))}
          </Layer>

          {/* Layer 3: draft polygon being drawn */}
          <Layer>
            {draftPoints.length > 1 && (
              <Line
                points={flattenPoints(draftPoints)}
                stroke="#f59e0b"
                strokeWidth={2 / scale}
                dash={[8 / scale, 4 / scale]}
                lineCap="round"
                lineJoin="round"
              />
            )}

            {/* Vertex dots */}
            {draftPoints.map(([x, y], i) => (
              <Circle
                key={i}
                x={x}
                y={y}
                radius={5 / scale}
                fill={i === 0 ? '#10b981' : '#f59e0b'}
                stroke="#fff"
                strokeWidth={1.5 / scale}
              />
            ))}

            {/* "Snap here to close" ring around first vertex */}
            {isDrawing && draftPoints.length >= MIN_VERTICES_TO_CLOSE && firstVertex && (
              <Circle
                x={firstVertex[0]}
                y={firstVertex[1]}
                radius={CLOSE_SNAP_RADIUS_IMG}
                stroke="#10b981"
                strokeWidth={1 / scale}
                dash={[4 / scale, 3 / scale]}
                fill="transparent"
              />
            )}

            {/* Vertex count label on first vertex */}
            {isDrawing && firstVertex && (
              <Text
                x={firstVertex[0] + 8 / scale}
                y={firstVertex[1] - 16 / scale}
                text={`${draftPoints.length}pts`}
                fontSize={11 / scale}
                fill="#f59e0b"
              />
            )}
          </Layer>
        </Stage>
      </div>

      {/* Polygon list (for debugging in v1) */}
      {closedPolygons.length > 0 && (
        <div className="text-xs text-zinc-400 font-mono">
          {closedPolygons.map((p, i) => (
            <div key={i}>
              Polygon {i + 1}: {p.points.length} vertices
              {p.unitId ? ` · ${p.unitId}` : ' · unassigned'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
