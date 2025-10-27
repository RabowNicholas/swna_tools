import { NextRequest, NextResponse } from 'next/server';
import { executeGenerator, createPdfResponse } from '@/lib/generator-utils';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const requestData = await request.json();

    // Validate required fields
    if (!requestData.client_record || !requestData.form_data) {
      return NextResponse.json(
        { error: 'Missing client_record or form_data' },
        { status: 400 }
      );
    }

    // Execute EE-3 generator
    const result = await executeGenerator('ee3_wrapper.py', requestData);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Return PDF file
    return createPdfResponse(result.filename!, result.pdf_data!);

  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('EE-3 generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}