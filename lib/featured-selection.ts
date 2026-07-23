import type { Apartment, FeaturedConfig } from '@/lib/types';
import { DEFAULT_FEATURED_CONFIG } from '@/lib/config-defaults';

export type FeaturedSelectionResult = {
  selected_unit_ids: string[];
  last_rotated_at: string;
  // Whether the result differs from the input featuredConfig — callers use
  // this to decide whether a DB write is needed.
  changed: boolean;
};

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function sameMembers(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
}

// Reconciles the Featured Units selection against current apartment
// availability and the rotation window. Pure function — no I/O. Callers
// (the /embed/[slug]/featured route) are responsible for persisting the
// result back to projects.featured_config when `changed` is true.
export function reconcileFeaturedSelection(
  apartments: Apartment[],
  featuredConfig: FeaturedConfig,
  now: Date,
): FeaturedSelectionResult {
  const slotCount = featuredConfig.slot_count ?? DEFAULT_FEATURED_CONFIG.slot_count!;
  const rotationDays = featuredConfig.rotation_days ?? DEFAULT_FEATURED_CONFIG.rotation_days!;
  const previousSelected = featuredConfig.selected_unit_ids ?? [];

  const available = apartments.filter((a) => a.status === 'available');
  const availableIds = new Set(available.map((a) => a.unit_id));

  // Pinned + available, always included. A pinned unit that's no longer
  // available is dropped silently — never replaced by another pinned unit.
  // Stable order (display_order) in case pins exceed slot_count.
  let pinnedAvailable = available
    .filter((a) => a.featured_pinned)
    .sort((a, b) => a.display_order - b.display_order)
    .map((a) => a.unit_id);
  if (pinnedAvailable.length > slotCount) {
    pinnedAvailable = pinnedAvailable.slice(0, slotCount);
  }
  const pinnedSet = new Set(pinnedAvailable);

  const lastRotatedAt = featuredConfig.last_rotated_at ? new Date(featuredConfig.last_rotated_at) : null;
  const rotationMs = rotationDays * 24 * 60 * 60 * 1000;
  const needsRotation = !lastRotatedAt || now.getTime() - lastRotatedAt.getTime() > rotationMs;

  // Non-pinned survivors: kept only when NOT rotating and still available.
  // Rotating discards every non-pinned pick, even still-available ones.
  const survivingNonPinned = needsRotation
    ? []
    : previousSelected.filter((id) => availableIds.has(id) && !pinnedSet.has(id));

  let combined = [...pinnedAvailable, ...survivingNonPinned].slice(0, slotCount);

  const remainingSlots = slotCount - combined.length;
  if (remainingSlots > 0) {
    const combinedSet = new Set(combined);
    const pool = available
      .map((a) => a.unit_id)
      .filter((id) => !combinedSet.has(id));
    combined = combined.concat(shuffle(pool).slice(0, remainingSlots));
  }

  const changed = needsRotation || !sameMembers(combined, previousSelected);
  const lastRotatedAtOut = needsRotation ? now.toISOString() : (featuredConfig.last_rotated_at ?? now.toISOString());

  return {
    selected_unit_ids: combined,
    last_rotated_at: lastRotatedAtOut,
    changed,
  };
}
