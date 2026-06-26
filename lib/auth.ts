import { NextRequest, NextResponse } from 'next/server';

// v1 auth: shared secret passed as the X-Editor-Secret header.
// Protects /editor/* and /api/* routes from public access.
//
// In production, set EDITOR_SHARED_SECRET to a long random string in Vercel
// env vars. The editor UI passes it automatically via a server-side session
// cookie set on first load (TODO: v1.1). For now, pass it as a header when
// calling the API from the editor.
export function requireEditorAuth(
  req: NextRequest,
): NextResponse | null {
  const secret = process.env.EDITOR_SHARED_SECRET;
  if (!secret) {
    // If the env var is not set, block all access to prevent accidental exposure.
    return NextResponse.json({ error: 'Editor auth not configured' }, { status: 500 });
  }
  const provided = req.headers.get('x-editor-secret');
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null; // auth passed
}

// For use in server components (page.tsx) — read the secret from a cookie
// set by the editor login flow (placeholder for v1.1; v1 uses env-var only).
export function getEditorSecretHeader(): Record<string, string> {
  const secret = process.env.EDITOR_SHARED_SECRET ?? '';
  return { 'x-editor-secret': secret };
}
