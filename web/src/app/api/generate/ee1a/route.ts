import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { EE1AGenerator } from '@/lib/generators/ee1a-generator';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    // Parse FormData to get signature file and form data
    const formData = await request.formData();
    const signatureFile = formData.get('signature_file') as File;
    const dataString = formData.get('data') as string;

    if (!dataString) {
      return NextResponse.json({ error: 'Missing form data' }, { status: 400 });
    }

    const requestData = JSON.parse(dataString);

    if (!requestData.client_record || !requestData.form_data) {
      return NextResponse.json({ error: 'Missing client_record or form_data' }, { status: 400 });
    }

    // Process signature file if provided
    if (signatureFile) {
      const bytes = await signatureFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      // Convert to base64 for generator
      requestData.form_data.signature_file = {
        data: buffer.toString('base64')
      };
    }

    // Generate PDF using TypeScript generator
    const generator = new EE1AGenerator();
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

    console.error('EE-1a generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}