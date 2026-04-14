import { NextRequest, NextResponse } from 'next/server';
import { airtableService } from '@/lib/airtable';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    // Require authentication
    await requireAuth();

    const clients = await airtableService.getClients();
    return NextResponse.json({ clients });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth();

    const { recordId, fields, prepend } = await request.json();

    if (!recordId) {
      return NextResponse.json(
        { error: 'Record ID is required' },
        { status: 400 }
      );
    }

    if (prepend) {
      const current = await airtableService.getClient(recordId);
      const mergedFields: Record<string, string | string[]> = {};

      if (typeof prepend.Log === 'string' && prepend.Log.length > 0) {
        const currentLog =
          typeof current.fields.Log === 'string' ? current.fields.Log : '';
        mergedFields.Log = currentLog
          ? `${prepend.Log}\n\n${currentLog}`
          : `${prepend.Log}\n`;
      }

      if (Array.isArray(prepend.Status) && prepend.Status.length > 0) {
        const newTags: string[] = prepend.Status;
        const rawStatus = current.fields.Status;
        const currentStatus: string[] = Array.isArray(rawStatus)
          ? (rawStatus as string[])
          : rawStatus
            ? [String(rawStatus)]
            : [];
        mergedFields.Status = [
          ...newTags,
          ...currentStatus.filter((t) => !newTags.includes(t)),
        ];
      }

      const updatedClient = await airtableService.updateClient(
        recordId,
        mergedFields
      );
      return NextResponse.json({ client: updatedClient });
    }

    const updatedClient = await airtableService.updateClient(recordId, fields);
    return NextResponse.json({ client: updatedClient });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('Error updating client:', error);
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    );
  }
}