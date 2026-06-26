import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireEditorAuth } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

// GET /api/apartments/:id
export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireEditorAuth(req);
  if (auth) return auth;

  const { id } = await params;
  const { data, error } = await db.from('apartments').select('*').eq('id', id).single();
  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(data);
}

// POST /api/apartments/:id — id = "new" creates a new apartment
export async function POST(req: NextRequest, { params }: Params) {
  const auth = requireEditorAuth(req);
  if (auth) return auth;

  const { id } = await params;
  if (id !== 'new') {
    return NextResponse.json({ error: 'Use PUT to update existing apartments' }, { status: 400 });
  }

  const body: Record<string, unknown> = await req.json();
  delete body.id;
  delete body.created_at;
  delete body.updated_at;

  const { data, error } = await db.from('apartments').insert(body).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}

// PUT /api/apartments/:id — partial update (used for polygon saves, field edits)
export async function PUT(req: NextRequest, { params }: Params) {
  const auth = requireEditorAuth(req);
  if (auth) return auth;

  const { id } = await params;
  const body: Record<string, unknown> = await req.json();
  delete body.id;
  delete body.created_at;
  delete body.updated_at;

  const { data, error } = await db
    .from('apartments')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}

// DELETE /api/apartments/:id
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = requireEditorAuth(req);
  if (auth) return auth;

  const { id } = await params;
  const { error } = await db.from('apartments').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return new NextResponse(null, { status: 204 });
}
