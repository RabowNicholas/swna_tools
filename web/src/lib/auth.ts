import { auth } from '@/app/api/auth/[...nextauth]/route';

/**
 * Get the current session on the server
 * Use this in Server Components and API routes
 */
export async function getSession() {
  return await auth();
}

/**
 * Require authentication - throws error if not authenticated
 * Use this in API routes that require authentication
 */
export async function requireAuth() {
  const session = await getSession();

  if (!session || !session.user) {
    throw new Error('Unauthorized');
  }

  return session;
}

/**
 * Check if user has admin role
 */
export function isAdmin(session: any): boolean {
  return session?.user?.role === 'admin';
}
