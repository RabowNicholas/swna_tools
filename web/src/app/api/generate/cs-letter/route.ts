import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { CSLetterGenerator } from '@/lib/generators/cs-letter-generator';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const requestData = await request.json();

    if (!requestData.form_data) {
      return NextResponse.json({ error: 'Missing form_data' }, { status: 400 });
    }

    const generator = new CSLetterGenerator();
    const result = await generator.generate(requestData.form_data);

    return new NextResponse(result.bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('CS letter generation error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
