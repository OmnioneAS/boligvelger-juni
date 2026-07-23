import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import type { Project, Apartment } from '@/lib/types';
import { reconcileFeaturedSelection, shuffle } from '@/lib/featured-selection';
import FeaturedWidgetClient from './FeaturedWidgetClient';

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };
type SearchParams = { searchParams: Promise<{ primary?: string; font?: string }> };

export default async function FeaturedPage({ params, searchParams }: Params & SearchParams) {
  const { slug } = await params;
  const { primary, font } = await searchParams;

  const { data: project, error } = await db
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !project) notFound();

  const { data: apartments } = await db
    .from('apartments')
    .select('*')
    .eq('project_id', project.id);

  const apartmentList = (apartments ?? []) as Apartment[];

  // Reconciles pinned/rotation/backfill and persists back to
  // projects.featured_config when the selection changed. Runs on ISR's
  // render cadence (cache miss / ~60s revalidation), not per visitor
  // request — see CLAUDE.md session 8 notes for why.
  const result = reconcileFeaturedSelection(apartmentList, project.featured_config ?? {}, new Date());

  if (result.changed) {
    await db
      .from('projects')
      .update({
        featured_config: {
          ...project.featured_config,
          selected_unit_ids: result.selected_unit_ids,
          last_rotated_at: result.last_rotated_at,
        },
      })
      .eq('id', project.id);
  }

  const byId = new Map(apartmentList.map((a) => [a.unit_id, a]));
  const featuredApartments = result.selected_unit_ids
    .map((id) => byId.get(id))
    .filter((a): a is Apartment => Boolean(a));

  const carouselImages = shuffle(
    featuredApartments.flatMap((a) => a.images.map((img) => ({ url: img.url, alt: img.alt }))),
  );

  return (
    <FeaturedWidgetClient
      project={project as Project}
      featuredApartments={featuredApartments}
      carouselImages={carouselImages}
      primaryColor={primary}
      fontFamily={font}
    />
  );
}
