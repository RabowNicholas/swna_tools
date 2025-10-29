import { auth } from '@/auth';

export default auth;

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
