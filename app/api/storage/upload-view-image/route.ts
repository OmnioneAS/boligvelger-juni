import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireEditorAuth } from '@/lib/auth';

// POST /api/storage/upload-view-image
// Body: FormData with { file: File, projectId: string, viewKey: string }
// Returns: { url: string }
//
// Uses service-role Supabase client — never called with the anon key.
// Auth: x-editor-secret header or editor_auth cookie (set by middleware).

export async function POST(req: NextRequest) {
  const auth = requireEditorAuth(req);
  if (auth) return auth;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  const projectId = formData.get('projectId');
  const viewKey = formData.get('viewKey');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }
  if (typeof projectId !== 'string' || !projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }
  if (typeof viewKey !== 'string' || !viewKey) {
    return NextResponse.json({ error: 'viewKey is required' }, { status: 400 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  // upsert=true: re-uploading for the same view overwrites in place.
  const storagePath = `${projectId}/${viewKey}/image.${ext}`;

  const { error: uploadError } = await db.storage
    .from('view-images')
    .upload(storagePath, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data: urlData } = db.storage
    .from('view-images')
    .getPublicUrl(storagePath);

  return NextResponse.json({ url: urlData.publicUrl });
}
