import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { airtableService } from '@/lib/airtable';
import { detectClientStatus } from '@/lib/email-utils';
import { DEFAULT_GROUP, DEFAULT_ON_TAGS, findGroup, toDateInputValue } from '@/lib/reports/hhc-weekly-config';

export const dynamic = 'force-dynamic';

export interface HHCWeeklyMatch {
  id: string;
  name: string;
  caseId: string;
  matchedTags: string[];
  lastUpdate: string;
}

function toDateOnly(value: string): Date {
  // "Last update" and query params are YYYY-MM-DD; parse as local date only.
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);

    const today = new Date();
    const defaultFrom = new Date(today);
    defaultFrom.setDate(defaultFrom.getDate() - 7);

    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const tagsParam = searchParams.get('tags');
    const groupParam = searchParams.get('group');

    const group = findGroup(groupParam ?? DEFAULT_GROUP);
    if (!group) {
      return NextResponse.json({ success: false, error: `Unknown HHC group: ${groupParam}` }, { status: 400 });
    }
    const groupStatuses: readonly string[] = group.statuses;

    const from = fromParam ? toDateOnly(fromParam) : toDateOnly(toDateInputValue(defaultFrom));
    const to = toParam ? toDateOnly(toParam) : toDateOnly(toDateInputValue(today));

    const activeTags = (tagsParam ? tagsParam.split(',') : DEFAULT_ON_TAGS)
      .map(tag => tag.trim())
      .filter(Boolean);

    const clients = await airtableService.getClients();

    const matches: HHCWeeklyMatch[] = [];

    for (const client of clients) {
      const fields = client.fields as Record<string, unknown>;

      if (!groupStatuses.includes(detectClientStatus(client as any))) {
        continue;
      }

      const statusField = fields['Status'];
      const status: string[] = Array.isArray(statusField)
        ? (statusField as string[])
        : typeof statusField === 'string'
          ? [statusField]
          : [];

      const matchedTags = status
        .map(tag => tag.trim())
        .filter(tag => activeTags.includes(tag));

      if (matchedTags.length === 0) {
        continue;
      }

      const lastUpdateRaw = fields['Last update'];
      if (typeof lastUpdateRaw !== 'string' || !lastUpdateRaw) {
        continue;
      }

      const lastUpdate = toDateOnly(lastUpdateRaw);
      if (lastUpdate < from || lastUpdate > to) {
        continue;
      }

      matches.push({
        id: client.id,
        name: (fields['Name'] as string) || 'Unknown',
        caseId: (fields['Case ID'] as string) || '',
        matchedTags,
        lastUpdate: lastUpdateRaw,
      });
    }

    matches.sort((a, b) => a.lastUpdate < b.lastUpdate ? 1 : -1);

    return NextResponse.json({
      success: true,
      data: {
        matches,
        group: group.id,
        window: {
          from: toDateInputValue(from),
          to: toDateInputValue(to),
        },
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('HHC weekly report error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
