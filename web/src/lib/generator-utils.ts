import { spawn } from 'child_process';
import path from 'path';

export interface GeneratorRequest {
  client_record: {
    id: string;
    fields: Record<string, string | number | boolean | undefined>;
  };
  form_data: Record<string, unknown>;
}

export interface GeneratorResponse {
  success: boolean;
  filename?: string;
  pdf_data?: string;
  content_type?: string;
  error?: string;
  warnings?: string[];
  stderr?: string;
}

export async function executeGenerator(
  wrapperScript: string,
  requestData: GeneratorRequest
): Promise<GeneratorResponse> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    console.log(`[Generator] Starting ${wrapperScript} execution`);

    // Get the project root (parent of web directory)
    const projectRoot = path.join(process.cwd(), '..');
    const scriptPath = path.join(projectRoot, 'scripts', wrapperScript);

    console.log(`[Generator] Script path: ${scriptPath}`);
    console.log(`[Generator] Working directory: ${projectRoot}`);

    // Spawn Python process
    const python = spawn('python3', [scriptPath], {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    // Send JSON data to Python script
    const inputData = JSON.stringify(requestData);
    console.log(`[Generator] Sending ${inputData.length} bytes to Python process`);
    python.stdin.write(inputData);
    python.stdin.end();

    // Collect output and log in real-time
    python.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(`[Generator] Python stdout: ${data.toString().substring(0, 200)}...`);
    });

    python.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      // Log Python stderr in real-time
      console.error(`[Generator] Python stderr: ${chunk}`);
    });

    // Handle process completion
    python.on('close', (code) => {
      const executionTime = Date.now() - startTime;
      console.log(`[Generator] Process closed with code ${code} after ${executionTime}ms`);

      if (code === 0) {
        try {
          const result: GeneratorResponse = JSON.parse(stdout);
          console.log(`[Generator] Success! Generated ${result.filename}, PDF size: ${result.pdf_data?.length || 0} bytes`);
          resolve(result);
        } catch (parseError) {
          console.error(`[Generator] Failed to parse stdout:`, stdout.substring(0, 500));
          console.error(`[Generator] Parse error:`, parseError);
          reject(new Error(`Failed to parse generator response: ${parseError}`));
        }
      } else {
        console.error(`[Generator] Execution failed with code ${code}`);
        console.error(`[Generator] Full stderr output:`, stderr);

        // Try to parse error response from stderr
        try {
          const errorResponse = JSON.parse(stderr);
          resolve({
            success: false,
            error: errorResponse.error || `Process exited with code ${code}`,
            stderr: stderr
          });
        } catch {
          // If stderr isn't JSON, return it as error
          resolve({
            success: false,
            error: `Generator failed with code ${code}: ${stderr}`,
            stderr: stderr
          });
        }
      }
    });

    // Handle process errors
    python.on('error', (error) => {
      console.error(`[Generator] Failed to spawn Python process:`, error);
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
}

export function createPdfResponse(
  filename: string,
  pdfData: string
): Response {
  const buffer = Buffer.from(pdfData, 'base64');
  
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    },
  });
}