import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { DoctorLetterGenerator } from '@/lib/generators/doctor-letter-generator';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const requestData = await request.json();

    if (!requestData.template_id || !requestData.form_data) {
      return NextResponse.json(
        { error: 'Missing template_id or form_data' },
        { status: 400 }
      );
    }

    const generator = new DoctorLetterGenerator();
    const result = await generator.generate(
      requestData.template_id,
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Doctor letter generation error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
