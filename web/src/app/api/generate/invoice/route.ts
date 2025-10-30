import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { InvoiceGenerator } from '@/lib/generators/invoice-generator';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const requestData = await request.json();

    // Validate required fields
    if (!requestData.form_data) {
      return NextResponse.json(
        { error: 'Missing form_data' },
        { status: 400 }
      );
    }

    // Generate Excel file using TypeScript generator
    const generator = new InvoiceGenerator();
    const result = await generator.generate(requestData.form_data);

    // Return Excel file as download (NOTE: .xlsx not .pdf)
    return new NextResponse(result.excelBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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

    console.error('Invoice generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}