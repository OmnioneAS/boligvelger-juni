import { NextRequest, NextResponse } from 'next/server';
import { EDITOR_AUTH_COOKIE } from '@/lib/auth';

// Protect all /editor/* routes with the shared editor secret.
//
// Two ways to authenticate:
//   1. Visit /editor/[projectId]?key=<secret> — sets an httpOnly cookie
//      then redirects to the same URL without the key param.
//   2. Return visit with the editor_auth cookie already set.
//
// Any other request to /editor/* returns 404 (not 401, to avoid revealing
// that a protected route exists at this path).

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const secret = process.env.EDITOR_SHARED_SECRET;

  if (!secret) {
    // Misconfigured — deny with 500-equivalent; don't expose the editor.
    return new NextResponse(null, { status: 404 });
  }

  // ?key= present — validate and set cookie, then redirect to clean URL.
  const keyParam = searchParams.get('key');
  if (keyParam !== null) {
    if (keyParam !== secret) {
      return new NextResponse(null, { status: 404 });
    }
    const cleanUrl = req.nextUrl.clone();
    cleanUrl.searchParams.delete('key');
    const res = NextResponse.redirect(cleanUrl);
    res.cookies.set(EDITOR_AUTH_COOKIE, secret, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 hours
    });
    return res;
  }

  // Cookie present and valid — allow through.
  const cookie = req.cookies.get(EDITOR_AUTH_COOKIE);
  if (cookie?.value === secret) {
    return NextResponse.next();
  }

  // No valid auth.
  return new NextResponse(null, { status: 404 });
}

export const config = {
  matcher: ['/editor/:path*'],
};
