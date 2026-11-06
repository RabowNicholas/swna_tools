import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { ReconsiderationLetterGenerator, RequestLetterError } from '@/lib/generators/claim-request-letters';
import { withToolTracking } from '@/lib/events/with-tracking';

async function handlePOST(request: NextRequest) {
  try {
    await requireAuth();

    const requestData = await request.json();

    if (!requestData.client_record || !requestData.form_data) {
      return NextResponse.json(
        { error: 'Missing client_record or form_data' },
        { status: 400 }
      );
    }

    const generator = new ReconsiderationLetterGenerator();
    const result = await generator.generate(
      requestData.client_record,
      requestData.doctor || '',
      requestData.form_data
    );

    return new NextResponse(result.pdfBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // A problem with what the user typed, not a server fault: return the message as-is
    if (error instanceof RequestLetterError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Reconsideration Request generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export const POST = withToolTracking('reconsideration', handlePOST);
