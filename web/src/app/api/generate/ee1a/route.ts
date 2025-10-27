import { NextRequest, NextResponse } from 'next/server';
import { executeGenerator, createPdfResponse } from '@/lib/generator-utils';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { requireAuth } from '@/lib/auth';

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

    if (!signatureFile) {
      return NextResponse.json({ error: 'Missing signature file' }, { status: 400 });
    }

    // Save signature file to temp directory
    const tempDir = tmpdir();
    const signaturePath = join(tempDir, `signature_${Date.now()}_${signatureFile.name}`);

    const bytes = await signatureFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(signaturePath, buffer);

    // Add signature path to request data
    requestData.form_data.signature_file = signaturePath;

    const result = await executeGenerator('ee1a_wrapper.py', requestData);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return createPdfResponse(result.filename!, result.pdf_data!);

  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('EE-1a generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}