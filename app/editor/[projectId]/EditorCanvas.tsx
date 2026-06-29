'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Konva from 'konva';
import { Stage, Layer, Image as KonvaImage, Line, Circle, Text } from 'react-konva';
import useImage from 'use-image';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Apartment, PolygonPoints } from '@/lib/types';
import type { UseActiveViewReturn } from './hooks/useActiveView';
import { useHistory } from './hooks/useHistory';
import { snapToNearby, distToSegment, EDGE_THRESHOLD_IMG } from './hooks/useSnap';

// ── Types ─────────────────────────────────────────────────────────────────────

type ClosedPolygon = {
  points: PolygonPoints;
  unitId: string;
};

// History entry stores the polygon state BEFORE an action, plus which unit changed.
type HistoryEntry = {
  polygons: ClosedPolygon[];
  changedUnitId: string;
};

type Props = {
  apartments: Apartment[];
  activeViewHook: UseActiveViewReturn;
  selectedUnitId: string | null;
  onSelectUnit: (unitId: string | null) => void;
  onPolygonSaved: (unitId: string, points: PolygonPoints | null) => void;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const MIN_VERTS = 3;
const CLOSE_SNAP_RADIUS = 12;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 10;
const ZOOM_FACTOR = 1.12;

// ── Helpers ───────────────────────────────────────────────────────────────────

function flattenPoints(pts: PolygonPoints): number[] {
  return pts.flatMap(([x, y]) => [x, y]);
}

// ── Background image ──────────────────────────────────────────────────────────

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

// ── Main component ────────────────────────────────────────────────────────────

export default function EditorCanvas({
  apartments,
  activeViewHook,
  selectedUnitId,
  onSelectUnit,
  onPolygonSaved,
}: Props) {
  const { activeView } = activeViewHook;

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  // Keep a ref to apartments so the view-change effect reads the latest value
  // without apartments being in its dependency array (which would re-seed mid-edit).
  const apartmentsRef = useRef(apartments);
  apartmentsRef.current = apartments;

  const [containerWidth, setContainerWidth] = useState(0);

  // Drawing state
  const [draftPoints, setDraftPoints] = useState<PolygonPoints>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Polygons and selection
  const [closedPolygons, setClosedPolygons] = useState<ClosedPolygon[]>([]);
  const [selectedPolyIdx, setSelectedPolyIdx] = useState<number | null>(null);
  const [selectedVertexIdx, setSelectedVertexIdx] = useState<number | null>(null);

  // Zoom / pan
  const [zoom, setZoom] = useState(1);
  const [panPos, setPanPos] = useState({ x: 0, y: 0 });
  const [isPanMode, setIsPanMode] = useState(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });

  const history = useHistory<HistoryEntry>();

  // Stable refs for keyboard handler callbacks (avoids stale closures)
  const closedPolygonsRef = useRef(closedPolygons);
  closedPolygonsRef.current = closedPolygons;
  const selectedPolyIdxRef = useRef(selectedPolyIdx);
  selectedPolyIdxRef.current = selectedPolyIdx;
  const selectedVertexIdxRef = useRef(selectedVertexIdx);
  selectedVertexIdxRef.current = selectedVertexIdx;
  const isDrawingRef = useRef(isDrawing);
  isDrawingRef.current = isDrawing;
  const draftPointsRef = useRef(draftPoints);
  draftPointsRef.current = draftPoints;
  const selectedUnitIdRef = useRef(selectedUnitId);
  selectedUnitIdRef.current = selectedUnitId;
  const onPolygonSavedRef = useRef(onPolygonSaved);
  onPolygonSavedRef.current = onPolygonSaved;
  const onSelectUnitRef = useRef(onSelectUnit);
  onSelectUnitRef.current = onSelectUnit;

  // ── ResizeObserver ──────────────────────────────────────────────────────────

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

  // ── Re-seed polygons when view changes ─────────────────────────────────────
  // apartments is intentionally excluded: the canvas is the source of truth
  // while editing a view. Re-seeding only on view switch ensures polygon saves
  // don't interrupt in-progress editing.

  useEffect(() => {
    if (!activeView) return;
    const apts = apartmentsRef.current;
    const existing: ClosedPolygon[] = [];
    for (const apt of apts) {
      const pts = apt.polygons[activeView.key];
      if (pts && pts.length >= MIN_VERTS) {
        existing.push({ points: pts, unitId: apt.unit_id });
      }
    }
    setClosedPolygons(existing);
    setDraftPoints([]);
    setIsDrawing(false);
    setSelectedPolyIdx(null);
    setSelectedVertexIdx(null);
    setZoom(1);
    setPanPos({ x: 0, y: 0 });
    history.clear();
  }, [activeView]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Commit helpers ──────────────────────────────────────────────────────────

  // Push current state to undo stack, apply new polygons, persist.
  const commitPolygons = useCallback(
    (newPolygons: ClosedPolygon[], changedUnitId: string) => {
      history.push({ polygons: closedPolygonsRef.current, changedUnitId });
      setClosedPolygons(newPolygons);
      const poly = newPolygons.find((p) => p.unitId === changedUnitId);
      onPolygonSavedRef.current(changedUnitId, poly?.points ?? null);
    },
    [history],
  );

  const closePolygon = useCallback(() => {
    const pts = draftPointsRef.current;
    const unitId = selectedUnitIdRef.current;
    if (pts.length < MIN_VERTS || !unitId) return;
    const without = closedPolygonsRef.current.filter((p) => p.unitId !== unitId);
    commitPolygons([...without, { points: pts, unitId }], unitId);
    setDraftPoints([]);
    setIsDrawing(false);
  }, [commitPolygons]);

  const cancelDraft = useCallback(() => {
    setDraftPoints([]);
    setIsDrawing(false);
  }, []);

  const deleteSelectedVertex = useCallback(() => {
    const polyIdx = selectedPolyIdxRef.current;
    const vertIdx = selectedVertexIdxRef.current;
    if (polyIdx === null || vertIdx === null) return;
    const poly = closedPolygonsRef.current[polyIdx];
    if (!poly || poly.points.length <= MIN_VERTS) return;
    const newPoints = poly.points.filter((_, i) => i !== vertIdx);
    const newPolys = closedPolygonsRef.current.map((p, i) =>
      i === polyIdx ? { ...p, points: newPoints } : p,
    );
    commitPolygons(newPolys, poly.unitId);
    setSelectedVertexIdx(null);
  }, [commitPolygons]);

  const undoLast = useCallback(() => {
    const entry = history.pop();
    if (!entry) return;
    setClosedPolygons(entry.polygons);
    setSelectedPolyIdx(null);
    setSelectedVertexIdx(null);
    const restored = entry.polygons.find((p) => p.unitId === entry.changedUnitId);
    onPolygonSavedRef.current(entry.changedUnitId, restored?.points ?? null);
  }, [history]);

  // ── Keyboard ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Enter' && isDrawingRef.current) closePolygon();
      if (e.key === 'Escape') {
        if (isDrawingRef.current) cancelDraft();
        else if (selectedPolyIdxRef.current !== null) {
          setSelectedPolyIdx(null);
          setSelectedVertexIdx(null);
        } else {
          onSelectUnitRef.current(null);
        }
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isDrawingRef.current) {
        deleteSelectedVertex();
      }
      if ((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        undoLast();
      }
      if (e.key === ' ') {
        e.preventDefault();
        setIsPanMode(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === ' ') setIsPanMode(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [closePolygon, cancelDraft, deleteSelectedVertex, undoLast]);

  // ── Early returns ───────────────────────────────────────────────────────────

  if (!activeView) {
    return (
      <div className="flex items-center justify-center h-96 bg-zinc-100 rounded-lg text-zinc-500 text-sm">
        No view selected. Upload an image above to begin.
      </div>
    );
  }

  if (containerWidth === 0) {
    return <div ref={containerRef} className="w-full h-96 bg-zinc-100 rounded-lg" />;
  }

  // ── Scale / dimensions ──────────────────────────────────────────────────────

  const baseScale = containerWidth / activeView.image_width;
  const totalScale = baseScale * zoom;
  const stageHeight = activeView.image_height * baseScale;

  const allPointLists = closedPolygons.map((p) => p.points as [number, number][]);

  // ── Stage event handlers ────────────────────────────────────────────────────

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    if (!e.evt.ctrlKey && !e.evt.metaKey) return;
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const dir = e.evt.deltaY > 0 ? 1 / ZOOM_FACTOR : ZOOM_FACTOR;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * dir));
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const imgX = (pointer.x - panPos.x) / (baseScale * zoom);
    const imgY = (pointer.y - panPos.y) / (baseScale * zoom);
    const newTotal = baseScale * newZoom;
    setZoom(newZoom);
    setPanPos({ x: pointer.x - imgX * newTotal, y: pointer.y - imgY * newTotal });
  };

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (!isPanMode || e.evt.button !== 0) return;
    isPanningRef.current = true;
    panStartRef.current = {
      mouseX: e.evt.clientX,
      mouseY: e.evt.clientY,
      panX: panPos.x,
      panY: panPos.y,
    };
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!isPanningRef.current) return;
    setPanPos({
      x: panStartRef.current.panX + (e.evt.clientX - panStartRef.current.mouseX),
      y: panStartRef.current.panY + (e.evt.clientY - panStartRef.current.mouseY),
    });
  };

  const handleMouseUp = () => {
    isPanningRef.current = false;
  };

  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    if (isPanMode || e.evt.button !== 0) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getRelativePointerPosition();
    if (!pos) return;

    if (isDrawing) {
      const snapped = snapToNearby(pos.x, pos.y, allPointLists);
      if (draftPoints.length >= MIN_VERTS) {
        const [fx, fy] = draftPoints[0];
        if (Math.hypot(pos.x - fx, pos.y - fy) <= CLOSE_SNAP_RADIUS) {
          closePolygon();
          return;
        }
      }
      setDraftPoints((prev) => [...prev, snapped]);
      return;
    }

    // Empty-space click (polygon/vertex clicks have cancelBubble = true)
    if (selectedPolyIdx !== null) {
      // First click away deselects the polygon
      setSelectedPolyIdx(null);
      setSelectedVertexIdx(null);
      return;
    }
    if (selectedUnitId) {
      // Start drawing for the selected apartment
      const snapped = snapToNearby(pos.x, pos.y, allPointLists);
      setDraftPoints([snapped]);
      setIsDrawing(true);
    }
  };

  const handleDblClick = () => {
    if (!isPanMode) closePolygon();
  };

  const handleContextMenu = (e: KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault();
  };

  // ── Polygon click (select or edge-insert) ───────────────────────────────────

  const handlePolygonClick = (e: KonvaEventObject<MouseEvent>, polyIdx: number) => {
    if (isPanMode || isDrawing) return;
    e.cancelBubble = true;
    const poly = closedPolygons[polyIdx];
    if (!poly) return;

    if (selectedPolyIdx === polyIdx) {
      // Already selected: try edge-click to insert vertex
      const stage = e.target.getStage();
      const pos = stage?.getRelativePointerPosition();
      if (pos) {
        let minDist = EDGE_THRESHOLD_IMG;
        let insertIdx = -1;
        let insertPt: [number, number] = [pos.x, pos.y];
        for (let i = 0; i < poly.points.length; i++) {
          const [ax, ay] = poly.points[i];
          const [bx, by] = poly.points[(i + 1) % poly.points.length];
          const { dist, t } = distToSegment(pos.x, pos.y, ax, ay, bx, by);
          if (dist < minDist) {
            minDist = dist;
            insertIdx = i + 1;
            insertPt = [ax + t * (bx - ax), ay + t * (by - ay)];
          }
        }
        if (insertIdx !== -1) {
          const newPoints = [...poly.points];
          newPoints.splice(insertIdx, 0, insertPt);
          const newPolys = closedPolygons.map((p, i) =>
            i === polyIdx ? { ...p, points: newPoints } : p,
          );
          commitPolygons(newPolys, poly.unitId);
          setSelectedVertexIdx(insertIdx);
          return;
        }
      }
    }

    onSelectUnit(poly.unitId);
    setSelectedPolyIdx(polyIdx);
    setSelectedVertexIdx(null);
  };

  // ── Vertex click / drag ─────────────────────────────────────────────────────

  const handleVertexClick = (
    e: KonvaEventObject<MouseEvent>,
    polyIdx: number,
    vertIdx: number,
  ) => {
    if (isPanMode || isDrawing) return;
    e.cancelBubble = true;
    setSelectedPolyIdx(polyIdx);
    setSelectedVertexIdx(vertIdx);
    onSelectUnit(closedPolygons[polyIdx].unitId);
  };

  const handleVertexDragEnd = (
    e: KonvaEventObject<DragEvent>,
    polyIdx: number,
    vertIdx: number,
  ) => {
    const poly = closedPolygons[polyIdx];
    if (!poly) return;
    const raw: [number, number] = [e.target.x(), e.target.y()];
    const exclude = poly.points[vertIdx] as [number, number];
    const [sx, sy] = snapToNearby(raw[0], raw[1], allPointLists, exclude);
    e.target.x(sx);
    e.target.y(sy);
    const newPoints = poly.points.map((pt, i) =>
      i === vertIdx ? ([sx, sy] as [number, number]) : pt,
    );
    const newPolys = closedPolygons.map((p, i) =>
      i === polyIdx ? { ...p, points: newPoints } : p,
    );
    commitPolygons(newPolys, poly.unitId);
  };

  // ── Cursor ──────────────────────────────────────────────────────────────────

  let cursor = 'default';
  if (isPanMode) cursor = isPanningRef.current ? 'grabbing' : 'grab';
  else if (isDrawing) cursor = 'crosshair';

  // ── Render ───────────────────────────────────────────────────────────────────

  const firstVertex = draftPoints[0];

  return (
    <div className="flex flex-col gap-3">
      {/* Status bar */}
      <div className="flex items-center gap-4 text-xs text-zinc-500 font-mono">
        {isDrawing ? (
          <>
            <span className="text-blue-600 font-semibold">Drawing…</span>
            <span>{draftPoints.length} vertices</span>
            <span>Dbl-click or Enter to close · Esc to cancel</span>
          </>
        ) : selectedUnitId ? (
          <>
            <span className="text-emerald-600 font-semibold">
              {closedPolygons.some((p) => p.unitId === selectedUnitId)
                ? 'Click polygon to select/edit · Click empty area to redraw'
                : 'Click canvas to draw polygon for this apartment'}
            </span>
            {history.canUndo && <span className="text-zinc-400">Ctrl+Z undo</span>}
          </>
        ) : (
          <span>Select an apartment in the sidebar to draw its polygon</span>
        )}
        <span className="ml-auto text-zinc-400">Space+drag pan · Ctrl+scroll zoom</span>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100"
        style={{ height: stageHeight, cursor }}
      >
        <Stage
          ref={stageRef}
          width={containerWidth}
          height={stageHeight}
          scaleX={totalScale}
          scaleY={totalScale}
          x={panPos.x}
          y={panPos.y}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleStageClick}
          onDblClick={handleDblClick}
          onContextMenu={handleContextMenu}
        >
          {/* Background image */}
          <Layer>
            <BackgroundImage
              src={activeView.image_url}
              width={activeView.image_width}
              height={activeView.image_height}
            />
          </Layer>

          {/* Closed polygons + vertex handles */}
          <Layer>
            {closedPolygons.map((poly, polyIdx) => {
              const isPolySelected = polyIdx === selectedPolyIdx;
              const isUnitMatch = poly.unitId === selectedUnitId;
              const fill = isPolySelected
                ? 'rgba(59,130,246,0.45)'
                : isUnitMatch
                  ? 'rgba(59,130,246,0.3)'
                  : 'rgba(59,130,246,0.15)';
              const stroke = isPolySelected || isUnitMatch ? '#1d4ed8' : '#3b82f6';
              const sw = (isPolySelected ? 3 : isUnitMatch ? 2.5 : 2) / totalScale;

              return [
                <Line
                  key={`line-${polyIdx}`}
                  points={flattenPoints(poly.points)}
                  closed
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={sw}
                  lineCap="round"
                  lineJoin="round"
                  onClick={(e) => handlePolygonClick(e, polyIdx)}
                />,
                ...(isPolySelected
                  ? poly.points.map(([x, y], vertIdx) => {
                      const isVertSel = vertIdx === selectedVertexIdx;
                      return (
                        <Circle
                          key={`vert-${polyIdx}-${vertIdx}`}
                          x={x}
                          y={y}
                          radius={(isVertSel ? 7 : 5) / totalScale}
                          fill={isVertSel ? '#f59e0b' : '#1d4ed8'}
                          stroke="#fff"
                          strokeWidth={1.5 / totalScale}
                          draggable={!isPanMode}
                          onClick={(e) => handleVertexClick(e, polyIdx, vertIdx)}
                          onDragEnd={(e) =>
                            handleVertexDragEnd(
                              e as unknown as KonvaEventObject<DragEvent>,
                              polyIdx,
                              vertIdx,
                            )
                          }
                        />
                      );
                    })
                  : []),
              ];
            })}
          </Layer>

          {/* Draft polygon */}
          <Layer>
            {draftPoints.length > 1 && (
              <Line
                points={flattenPoints(draftPoints)}
                stroke="#f59e0b"
                strokeWidth={2 / totalScale}
                dash={[8 / totalScale, 4 / totalScale]}
                lineCap="round"
                lineJoin="round"
              />
            )}
            {draftPoints.map(([x, y], i) => (
              <Circle
                key={i}
                x={x}
                y={y}
                radius={5 / totalScale}
                fill={i === 0 ? '#10b981' : '#f59e0b'}
                stroke="#fff"
                strokeWidth={1.5 / totalScale}
              />
            ))}
            {isDrawing && draftPoints.length >= MIN_VERTS && firstVertex && (
              <Circle
                x={firstVertex[0]}
                y={firstVertex[1]}
                radius={CLOSE_SNAP_RADIUS / totalScale}
                stroke="#10b981"
                strokeWidth={1 / totalScale}
                dash={[4 / totalScale, 3 / totalScale]}
                fill="transparent"
              />
            )}
            {isDrawing && firstVertex && (
              <Text
                x={firstVertex[0] + 8 / totalScale}
                y={firstVertex[1] - 16 / totalScale}
                text={`${draftPoints.length}pts`}
                fontSize={11 / totalScale}
                fill="#f59e0b"
              />
            )}
          </Layer>
        </Stage>
      </div>

      {/* Vertex hint */}
      {selectedPolyIdx !== null && !isDrawing && (
        <div className="text-xs text-zinc-400 font-mono">
          {closedPolygons[selectedPolyIdx]?.points.length} vertices ·{' '}
          {selectedVertexIdx !== null
            ? 'drag to move · Delete to remove'
            : 'click edge to insert vertex · click vertex to select'}
          {(closedPolygons[selectedPolyIdx]?.points.length ?? 0) <= MIN_VERTS
            ? ' (minimum 3, cannot delete)'
            : ''}
        </div>
      )}
    </div>
  );
}
