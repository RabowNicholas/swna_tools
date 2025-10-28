import { auth } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname.startsWith('/login');

  // If not logged in and not on login page, redirect to login
  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // If logged in and on login page, redirect to home
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
});

// Protect all routes except login and auth API routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - /api/auth (NextAuth API routes)
     * - /_next (Next.js internals)
     * - /favicon.ico, /robots.txt, etc. (static files)
     */
    '/((?!api/auth|_next|favicon.ico|robots.txt).*)',
  ],
};
