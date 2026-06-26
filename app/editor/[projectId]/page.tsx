import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import type { Project, Apartment } from '@/lib/types';
import EditorShell from './EditorShell';

// Editor routes are never cached — always fetch fresh data.
export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { projectId } = await params;
  const { data } = await db
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single();
  return { title: data ? `Editor — ${data.name}` : 'Editor' };
}

export default async function EditorPage({ params }: PageProps) {
  const { projectId } = await params;

  // Fetch project
  const { data: projectRow, error: projectError } = await db
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError || !projectRow) {
    notFound();
  }

  // Fetch apartments ordered by display_order
  const { data: apartmentRows } = await db
    .from('apartments')
    .select('*')
    .eq('project_id', projectId)
    .order('display_order', { ascending: true });

  const project = projectRow as Project;
  const apartments = (apartmentRows ?? []) as Apartment[];

  return <EditorShell project={project} apartments={apartments} />;
}
