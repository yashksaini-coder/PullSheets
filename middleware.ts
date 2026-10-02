import { getSessionCookie } from 'better-auth/cookies';
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const has = getSessionCookie(req);
  if (!has) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/editor', '/account'] };
