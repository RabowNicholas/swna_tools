import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { EN16Generator } from '@/lib/generators/en16-generator';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const requestData = await request.json();

    if (!requestData.client_record || !requestData.form_data) {
      return NextResponse.json({ error: 'Missing client_record or form_data' }, { status: 400 });
    }

    // Extract claimant and case_id from form_data
    const claimant = requestData.form_data.claimant || '';
    const caseId = requestData.form_data.case_id || '';

    if (!claimant || !caseId) {
      return NextResponse.json({ error: 'Missing claimant or case_id in form_data' }, { status: 400 });
    }

    // Generate PDF using TypeScript generator
    const generator = new EN16Generator();
    const result = await generator.generate(claimant, caseId);

    // Return PDF as download
    return new NextResponse(result.pdfBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('EN-16 generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
