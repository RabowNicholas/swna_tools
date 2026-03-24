import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { airtableService } from '@/lib/airtable';

export async function POST(request: NextRequest) {
  try {
    console.log('[IR Create] Request started at', new Date().toISOString());

    const session = await requireAuth();

    const { clientId, doctor } = await request.json();

    if (!clientId) {
      return NextResponse.json({ error: 'Missing clientId' }, { status: 400 });
    }

    const userName = session.user?.name || '';
    const userEmail = session.user?.email || '';
    const notes = userName || userEmail
      ? `Created via EE-10 generator by ${userName}${userEmail ? ` (${userEmail})` : ''}`
      : 'Created via EE-10 generator';

    console.log('[IR Create] Creating IR record for client:', clientId, 'doctor:', doctor);

    const record = await airtableService.createIRRecord({ clientId, doctor, notes });

    console.log('[IR Create] IR record created:', record.id);

    return NextResponse.json({ record });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('[IR Create] Error:', error);
    return NextResponse.json({
      error: 'Failed to create IR record',
      message: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
