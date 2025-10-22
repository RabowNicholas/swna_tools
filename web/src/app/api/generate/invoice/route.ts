import { NextRequest, NextResponse } from 'next/server';
import { executeGenerator, createPdfResponse } from '@/lib/generator-utils';

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    
    // Validate required fields
    if (!requestData.form_data) {
      return NextResponse.json(
        { error: 'Missing form_data' },
        { status: 400 }
      );
    }

    // Execute Invoice generator
    const result = await executeGenerator('invoice_wrapper.py', requestData);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Return PDF file
    return createPdfResponse(result.filename!, result.pdf_data!);
    
  } catch (error) {
    console.error('Invoice generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}