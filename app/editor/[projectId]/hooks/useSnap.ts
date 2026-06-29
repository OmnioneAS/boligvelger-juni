export const SNAP_RADIUS_IMG = 10;
export const EDGE_THRESHOLD_IMG = 8;

// Snap [x,y] to the nearest point in allPointLists within SNAP_RADIUS_IMG.
// Optionally skip a specific point (e.g. the vertex currently being dragged).
export function snapToNearby(
  x: number,
  y: number,
  allPointLists: [number, number][][],
  excludePoint?: [number, number],
): [number, number] {
  let minDist = SNAP_RADIUS_IMG;
  let result: [number, number] = [x, y];

  for (const pts of allPointLists) {
    for (const [px, py] of pts) {
      if (excludePoint && px === excludePoint[0] && py === excludePoint[1]) continue;
      const d = Math.hypot(x - px, y - py);
      if (d < minDist) {
        minDist = d;
        result = [px, py];
      }
    }
  }

  return result;
}

// Perpendicular distance from point P to segment AB, and the parameter t ∈ [0,1]
// indicating where on AB the closest point lies.
export function distToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): { dist: number; t: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { dist: Math.hypot(px - ax, py - ay), t: 0 };
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return {
    dist: Math.hypot(px - (ax + t * dx), py - (ay + t * dy)),
    t,
  };
}
