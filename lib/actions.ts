'use server';

import { db } from '@/lib/db';
import type { Apartment, ViewDefinition } from '@/lib/types';

// Allow null on every field so optional string columns can be cleared (→ NULL).
// Supabase's REST API omits undefined values but respects explicit null.
type ApartmentPatch = {
  [K in keyof Omit<
    Apartment,
    'id' | 'project_id' | 'created_at' | 'updated_at'
  >]?: Apartment[K] | null;
};

export async function saveApartmentFields(
  id: string,
  patch: ApartmentPatch,
): Promise<{ ok: true; apartment: Apartment } | { ok: false; error: string }> {
  const { data, error } = await db
    .from('apartments')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Unknown error' };
  }
  return { ok: true, apartment: data as Apartment };
}

export async function saveProjectViews(
  id: string,
  views: ViewDefinition[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await db.from('projects').update({ views }).eq('id', id);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
