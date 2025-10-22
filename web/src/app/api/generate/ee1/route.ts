import { NextRequest, NextResponse } from 'next/server';
import { executeGenerator, createPdfResponse } from '@/lib/generator-utils';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const clientRecordStr = formData.get('client_record') as string;
    const formDataStr = formData.get('form_data') as string;
    const signatureFile = formData.get('signature_file') as File | null;
    
    if (!clientRecordStr || !formDataStr) {
      return NextResponse.json({ error: 'Missing client_record or form_data' }, { status: 400 });
    }

    const client_record = JSON.parse(clientRecordStr);
    const parsedFormData = JSON.parse(formDataStr);
    
    // Convert signature file to base64 if present
    if (signatureFile) {
      const fileBuffer = await signatureFile.arrayBuffer();
      const base64Data = Buffer.from(fileBuffer).toString('base64');
      parsedFormData.signature_file = {
        name: signatureFile.name,
        type: signatureFile.type,
        size: signatureFile.size,
        data: base64Data
      };
    }

    const requestData = {
      client_record,
      form_data: parsedFormData
    };

    const result = await executeGenerator('ee1_wrapper.py', requestData);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return createPdfResponse(result.filename!, result.pdf_data!);
    
  } catch (error) {
    console.error('EE-1 generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}