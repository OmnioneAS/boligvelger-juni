import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import type { Project, Apartment } from '@/lib/types';
import { resolveLabel } from '@/lib/config-defaults';
import ApartmentDetailContent from '../ApartmentDetailContent';
import EmbedResizeSync from './EmbedResizeSync';
import BackToOverviewButton from './BackToOverviewButton';

export const revalidate = 60;

type Params = { params: Promise<{ slug: string; unitId: string }> };

const getData = cache(async (slug: string, unitId: string) => {
  const { data: project, error } = await db
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !project) return null;

  const { data: apartment } = await db
    .from('apartments')
    .select('*')
    .eq('project_id', project.id)
    .eq('unit_id', unitId)
    .single();

  if (!apartment) return null;

  return { project: project as Project, apartment: apartment as Apartment };
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, unitId } = await params;
  const data = await getData(slug, unitId);
  if (!data) return {};

  const { project, apartment } = data;
  const title = `${apartment.title || apartment.unit_id} — ${project.name}`;
  const description =
    apartment.description ||
    [apartment.price, apartment.size].filter(Boolean).join(' · ') ||
    project.name;
  const sortedImages = [...apartment.images].sort((a, b) => a.order - b.order);
  const ogImage = sortedImages[0]?.url;
  const canonical = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/embed/${slug}/${unitId}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
  };
}

export default async function UnitPage({ params }: Params) {
  const { slug, unitId } = await params;
  const data = await getData(slug, unitId);
  if (!data) notFound();

  const { project, apartment } = data;
  const overviewUrl = project.cta_config.overview_url;

  return (
    <div className="min-h-screen bg-white max-w-lg mx-auto">
      <EmbedResizeSync slug={slug} />
      {overviewUrl && (
        <BackToOverviewButton
          overviewUrl={overviewUrl}
          label={resolveLabel(project.labels, 'cta_back_to_overview')}
        />
      )}
      <ApartmentDetailContent apartment={apartment} project={project} />
    </div>
  );
}
