import { NextRequest, NextResponse } from 'next/server';
import { executeGenerator, createPdfResponse } from '@/lib/generator-utils';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('[EE-10] Request started at', new Date().toISOString());

    await requireAuth();

    const requestData = await request.json();

    // Log request details
    const requestSize = JSON.stringify(requestData).length;
    console.log('[EE-10] Request size:', requestSize, 'bytes');
    console.log('[EE-10] Doctor:', requestData.doctor);
    console.log('[EE-10] Client ID:', requestData.client_record?.Name || 'unknown');

    if (!requestData.client_record || !requestData.form_data) {
      console.error('[EE-10] Missing required fields:', {
        hasClientRecord: !!requestData.client_record,
        hasFormData: !!requestData.form_data
      });
      return NextResponse.json({ error: 'Missing client_record or form_data' }, { status: 400 });
    }

    // Validate doctor parameter
    if (!requestData.doctor || !['La Plata', 'Dr. Lewis'].includes(requestData.doctor)) {
      console.error('[EE-10] Invalid doctor selection:', requestData.doctor);
      return NextResponse.json({ error: 'Invalid doctor selection' }, { status: 400 });
    }

    console.log('[EE-10] Starting Python generator execution...');
    const result = await executeGenerator('ee10_wrapper.py', requestData);

    const executionTime = Date.now() - startTime;
    console.log('[EE-10] Generator execution completed in', executionTime, 'ms');

    if (!result.success) {
      console.error('[EE-10] Generation failed:', result.error);
      console.error('[EE-10] Stderr output:', result.stderr);
      return NextResponse.json({
        error: result.error,
        details: result.stderr
      }, { status: 500 });
    }

    console.log('[EE-10] PDF generated successfully, size:', result.pdf_data?.length || 0, 'bytes');
    console.log('[EE-10] Filename:', result.filename);
    console.log('[EE-10] Total execution time:', executionTime, 'ms');

    return createPdfResponse(result.filename!, result.pdf_data!);

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('[EE-10] Fatal error after', executionTime, 'ms');

    if (error instanceof Error && error.message === 'Unauthorized') {
      console.error('[EE-10] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('[EE-10] Unhandled error:', error);
    console.error('[EE-10] Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}