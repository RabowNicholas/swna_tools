import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { AddressChangeGenerator } from '@/lib/generators/address-change-generator';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const requestData = await request.json();

    if (!requestData.client_record || !requestData.form_data) {
      return NextResponse.json({ error: 'Missing client_record or form_data' }, { status: 400 });
    }

    // Generate PDF using TypeScript generator
    const generator = new AddressChangeGenerator();
    const result = await generator.generate(
      requestData.client_record,
      requestData.doctor || '',
      requestData.form_data
    );

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

    console.error('Address Change generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}