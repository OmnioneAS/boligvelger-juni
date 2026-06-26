import { NextRequest, NextResponse } from 'next/server';

// Cookie name shared between middleware.ts (writer) and requireEditorAuth (reader).
export const EDITOR_AUTH_COOKIE = 'editor_auth';

// Protects API routes called from the editor.
// Accepts either:
//   - x-editor-secret header (programmatic / server-to-server access)
//   - editor_auth cookie   (browser requests from /editor/* pages)
export function requireEditorAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.EDITOR_SHARED_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Editor auth not configured' }, { status: 500 });
  }

  if (req.headers.get('x-editor-secret') === secret) return null;
  if (req.cookies.get(EDITOR_AUTH_COOKIE)?.value === secret) return null;

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// For server components that need to call API routes with the secret header.
export function getEditorSecretHeader(): Record<string, string> {
  const secret = process.env.EDITOR_SHARED_SECRET ?? '';
  return { 'x-editor-secret': secret };
}
