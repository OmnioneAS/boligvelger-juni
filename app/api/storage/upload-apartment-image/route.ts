import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireEditorAuth } from '@/lib/auth';

// POST /api/storage/upload-apartment-image
// Body: FormData { file: File, apartmentId: string, filename: string }
// Returns: { url: string }

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
  const apartmentId = formData.get('apartmentId');
  const filename = formData.get('filename');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }
  if (typeof apartmentId !== 'string' || !apartmentId) {
    return NextResponse.json({ error: 'apartmentId is required' }, { status: 400 });
  }

  const safeFilename =
    typeof filename === 'string' && filename
      ? filename.replace(/[^a-z0-9._-]/gi, '_')
      : `image_${Date.now()}.${file.name.split('.').pop()?.toLowerCase() ?? 'jpg'}`;

  const storagePath = `${apartmentId}/${safeFilename}`;

  const { error: uploadError } = await db.storage
    .from('apartment-images')
    .upload(storagePath, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data: urlData } = db.storage
    .from('apartment-images')
    .getPublicUrl(storagePath);

  return NextResponse.json({ url: urlData.publicUrl });
}
