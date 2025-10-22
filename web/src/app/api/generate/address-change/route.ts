import { NextRequest, NextResponse } from 'next/server';
import { executeGenerator, createPdfResponse } from '@/lib/generator-utils';

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    
    if (!requestData.client_record || !requestData.form_data) {
      return NextResponse.json({ error: 'Missing client_record or form_data' }, { status: 400 });
    }

    const result = await executeGenerator('address_change_wrapper.py', requestData);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return createPdfResponse(result.filename!, result.pdf_data!);
    
  } catch (error) {
    console.error('Address Change generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}