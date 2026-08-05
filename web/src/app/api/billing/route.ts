import { NextRequest, NextResponse } from 'next/server';
import { airtableService } from '@/lib/airtable';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const { clientId, description, notes } = await request.json();

    if (!clientId || !description) {
      return NextResponse.json(
        { error: 'clientId and description are required' },
        { status: 400 }
      );
    }

    const record = await airtableService.createBillingRecord({
      clientId,
      description,
      notes,
    });

    return NextResponse.json({ record });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Error creating billing record:', error);
    // Pass Airtable's own message through — a bare failure gives no clue which
    // field it rejected.
    return NextResponse.json(
      {
        error: 'Failed to create billing record',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
