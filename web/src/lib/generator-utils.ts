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
}

export async function executeGenerator(
  wrapperScript: string,
  requestData: GeneratorRequest
): Promise<GeneratorResponse> {
  return new Promise((resolve, reject) => {
    // Get the project root (parent of web directory)
    const projectRoot = path.join(process.cwd(), '..');
    const scriptPath = path.join(projectRoot, 'scripts', wrapperScript);
    
    // Spawn Python process
    const python = spawn('python3', [scriptPath], {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    // Send JSON data to Python script
    python.stdin.write(JSON.stringify(requestData));
    python.stdin.end();

    // Collect output
    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Handle process completion
    python.on('close', (code) => {
      if (code === 0) {
        try {
          const result: GeneratorResponse = JSON.parse(stdout);
          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse generator response: ${parseError}`));
        }
      } else {
        console.error('Python stderr:', stderr);
        reject(new Error(`Generator failed with code ${code}: ${stderr}`));
      }
    });

    // Handle process errors
    python.on('error', (error) => {
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