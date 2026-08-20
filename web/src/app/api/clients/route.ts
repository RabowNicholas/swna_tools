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

    const { recordId, fields, prepend, remove } = await request.json();

    if (!recordId) {
      return NextResponse.json(
        { error: 'Record ID is required' },
        { status: 400 }
      );
    }

    if (prepend) {
      const current = await airtableService.getClient(recordId);
      // Any plain `fields` sent alongside `prepend` go in the same PATCH, so a
      // caller updating a record and logging it can't end up with one applied
      // and not the other.
      const mergedFields: Record<string, string | string[]> = { ...(fields ?? {}) };

      if (typeof prepend.Log === 'string' && prepend.Log.length > 0) {
        const currentLog =
          typeof current.fields.Log === 'string' ? current.fields.Log : '';
        mergedFields.Log = currentLog
          ? `${prepend.Log}\n\n${currentLog}`
          : `${prepend.Log}\n`;
      }

      // Status is rewritten whole, so adds and removes are resolved together
      // against what the record currently holds. A tag named in both is kept —
      // the caller asked for it, and dropping it would be the surprising read.
      const addedStatus: string[] = Array.isArray(prepend.Status)
        ? prepend.Status
        : [];
      const removedStatus: string[] = Array.isArray(remove?.Status)
        ? remove.Status
        : [];

      if (addedStatus.length > 0 || removedStatus.length > 0) {
        const rawStatus = current.fields.Status;
        const currentStatus: string[] = Array.isArray(rawStatus)
          ? (rawStatus as string[])
          : rawStatus
            ? [String(rawStatus)]
            : [];
        mergedFields.Status = [
          ...addedStatus,
          ...currentStatus.filter(
            (t) => !addedStatus.includes(t) && !removedStatus.includes(t)
          ),
        ];
      }

      if (
        Array.isArray(prepend.ClaimComplete) &&
        prepend.ClaimComplete.length > 0
      ) {
        const newTags: string[] = prepend.ClaimComplete;
        const rawClaimComplete = current.fields['Claim Complete'];
        const currentClaimComplete: string[] = Array.isArray(rawClaimComplete)
          ? (rawClaimComplete as string[])
          : rawClaimComplete
            ? [String(rawClaimComplete)]
            : [];
        mergedFields['Claim Complete'] = [
          ...newTags,
          ...currentClaimComplete.filter((t) => !newTags.includes(t)),
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
    // Pass Airtable's own message through — a bare "Failed to update client"
    // gives no clue which field it rejected.
    return NextResponse.json(
      {
        error: 'Failed to update client',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}