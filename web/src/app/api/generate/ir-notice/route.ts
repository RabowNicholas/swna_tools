import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { LaPlataNoticeGenerator } from '@/lib/generators/ir-notice-generator';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const requestData = await request.json();

    if (!requestData.client_record || !requestData.form_data) {
      return NextResponse.json({ error: 'Missing client_record or form_data' }, { status: 400 });
    }

    // Extract fields from form_data
    const clientName = requestData.form_data.client_name || '';
    const fileNumber = requestData.form_data.file_number || '';
    const appointmentDate = requestData.form_data.appointment_date || '';

    if (!clientName || !fileNumber || !appointmentDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate PDF using TypeScript generator
    const generator = new LaPlataNoticeGenerator();
    const result = await generator.generate(clientName, fileNumber, appointmentDate);

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

    console.error('IR Notice generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}