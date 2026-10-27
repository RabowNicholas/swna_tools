import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { saveProfile } from '@/lib/profiles';
import { cleanInitials, profileError } from '@/lib/profile-fields';

/**
 * Saves the signed-in person's own name and initials (Settings). Whose row it
 * is always comes from the session, never the request.
 */
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const initials = cleanInitials(typeof body.initials === 'string' ? body.initials : '');
  const problem = profileError(name, initials);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  try {
    await saveProfile(session.user.email, { name, initials });
  } catch (e) {
    console.error('[profile] save failed:', e);
    return NextResponse.json({ error: 'Couldn’t save. Try again in a moment.' }, { status: 500 });
  }
  return NextResponse.json({ name, initials });
}
