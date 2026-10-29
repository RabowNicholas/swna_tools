import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { HHCWeeklyReportGenerator, HHCWeeklyReportRow } from '@/lib/generators/hhc-weekly-report-generator';
import { findGroup } from '@/lib/reports/hhc-weekly-config';
import { withToolTracking } from '@/lib/events/with-tracking';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

async function handlePOST(request: NextRequest) {
  try {
    await requireAuth();

    const requestData = await request.json();
    const rows: HHCWeeklyReportRow[] = requestData.rows;
    const group = findGroup(requestData.group);
    const { from, to } = requestData;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Missing rows' }, { status: 400 });
    }
    if (!group) {
      return NextResponse.json({ error: 'Unknown HHC group' }, { status: 400 });
    }
    if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) {
      return NextResponse.json({ error: 'Missing date range' }, { status: 400 });
    }

    const generator = new HHCWeeklyReportGenerator();
    const result = await generator.generate({ groupLabel: group.label, from, to, rows });

    return new NextResponse(result.excelBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('HHC weekly report generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export const POST = withToolTracking('hhc-weekly', handlePOST);
