// Public read-only endpoint for the embed widget.
// Week 3: flesh out with ISR headers and full data shape.
import { NextRequest, NextResponse } from 'next/server';
import { dbPublic } from '@/lib/db';

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const { data: project, error } = await dbPublic
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: apartments } = await dbPublic
    .from('apartments')
    .select('*')
    .eq('project_id', project.id)
    .order('display_order', { ascending: true });

  return NextResponse.json(
    { project, apartments: apartments ?? [] },
    {
      headers: {
        // 60 s CDN cache; stale-while-revalidate matches ISR revalidate = 60
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
      },
    },
  );
}
