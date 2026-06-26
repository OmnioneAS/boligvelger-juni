import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireEditorAuth } from '@/lib/auth';
import { buildDefaultProject } from '@/lib/config-defaults';

type Params = { params: Promise<{ id: string }> };

// GET /api/projects/:id
export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireEditorAuth(req);
  if (auth) return auth;

  const { id } = await params;
  const { data, error } = await db.from('projects').select('*').eq('id', id).single();
  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(data);
}

// PUT /api/projects/:id  — full or partial update
export async function PUT(req: NextRequest, { params }: Params) {
  const auth = requireEditorAuth(req);
  if (auth) return auth;

  const { id } = await params;
  const body: Record<string, unknown> = await req.json();

  // Prevent overwriting id or timestamps via the body
  delete body.id;
  delete body.created_at;
  delete body.updated_at;

  const { data, error } = await db
    .from('projects')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}

// POST /api/projects/:id — special: id = "new" creates with defaults
export async function POST(req: NextRequest, { params }: Params) {
  const auth = requireEditorAuth(req);
  if (auth) return auth;

  const { id } = await params;
  if (id !== 'new') {
    return NextResponse.json({ error: 'Use PUT to update existing projects' }, { status: 400 });
  }

  const body: { slug: string; name: string } = await req.json();
  if (!body.slug || !body.name) {
    return NextResponse.json({ error: 'slug and name required' }, { status: 400 });
  }

  const payload = buildDefaultProject(body.slug, body.name);
  const { data, error } = await db.from('projects').insert(payload).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}
