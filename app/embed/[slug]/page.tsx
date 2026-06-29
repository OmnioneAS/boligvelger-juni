import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import type { Project, Apartment } from '@/lib/types';
import WidgetClient from './WidgetClient';

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

export default async function EmbedPage({ params }: Params) {
  const { slug } = await params;

  const { data: project, error } = await db
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !project) notFound();

  const { data: apartments } = await db
    .from('apartments')
    .select('*')
    .eq('project_id', project.id)
    .order('display_order', { ascending: true });

  return (
    <WidgetClient
      project={project as Project}
      apartments={(apartments ?? []) as Apartment[]}
    />
  );
}
