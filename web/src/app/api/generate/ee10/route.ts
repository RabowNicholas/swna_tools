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

    // Call Python serverless function
    // Use internal URL to bypass deployment protection
    const pythonEndpoint = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/generate-ee10`
      : 'http://localhost:3000/api/generate-ee10';

    console.log('[EE-10] Calling Python endpoint:', pythonEndpoint);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add bypass token if available
    if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
      headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    }

    const pythonResponse = await fetch(pythonEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestData)
    });

    const executionTime = Date.now() - startTime;
    console.log('[EE-10] Generator execution completed in', executionTime, 'ms');
    console.log('[EE-10] Python response status:', pythonResponse.status);
    console.log('[EE-10] Python response headers:', Object.fromEntries(pythonResponse.headers.entries()));

    // Get response text first to see what we actually got
    const responseText = await pythonResponse.text();
    console.log('[EE-10] Python response body (first 500 chars):', responseText.substring(0, 500));

    if (!pythonResponse.ok) {
      console.error('[EE-10] Generation failed with status:', pythonResponse.status);
      console.error('[EE-10] Response body:', responseText);

      // Try to parse as JSON, but if it fails, return the text
      try {
        const errorData = JSON.parse(responseText);
        return NextResponse.json({
          error: errorData.error || 'Python function failed',
          details: errorData.trace || responseText
        }, { status: 500 });
      } catch {
        return NextResponse.json({
          error: 'Python function returned non-JSON response',
          details: responseText
        }, { status: 500 });
      }
    }

    // Try to parse the response
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[EE-10] Failed to parse Python response as JSON');
      console.error('[EE-10] Response was:', responseText);
      return NextResponse.json({
        error: 'Invalid JSON response from Python function',
        details: responseText
      }, { status: 500 });
    }

    console.log('[EE-10] PDF generated successfully, size:', result.pdf_data?.length || 0, 'bytes');
    console.log('[EE-10] Filename:', result.filename);
    console.log('[EE-10] Total execution time:', executionTime, 'ms');

    return createPdfResponse(result.filename, result.pdf_data);

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