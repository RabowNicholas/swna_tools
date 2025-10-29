#!/usr/bin/env python3
"""
EE-10 Generator wrapper for Next.js integration.
"""

import sys
import json
from pathlib import Path
from io import BytesIO

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from generators.ee10_generator import EE10Generator

def create_response(success: bool, filename: str = None, pdf_data: bytes = None, error: str = None):
    """Create standardized JSON response"""
    import base64
    response = {
        'success': success,
        'filename': filename,
        'error': error
    }
    if pdf_data:
        response['pdf_data'] = base64.b64encode(pdf_data).decode('utf-8')
    return json.dumps(response)

if __name__ == "__main__":
    try:
        print("[EE-10 Wrapper] Starting execution", file=sys.stderr)

        # Read JSON input from stdin
        input_raw = sys.stdin.read()
        print(f"[EE-10 Wrapper] Received input size: {len(input_raw)} bytes", file=sys.stderr)

        input_data = json.loads(input_raw)

        client_record = input_data.get('client_record', {})
        form_data = input_data.get('form_data', {})
        doctor = input_data.get('doctor', 'La Plata')  # Extract doctor parameter

        print(f"[EE-10 Wrapper] Doctor selection: {doctor}", file=sys.stderr)
        print(f"[EE-10 Wrapper] Client: {client_record.get('Name', 'unknown')}", file=sys.stderr)
        print(f"[EE-10 Wrapper] Form data keys: {list(form_data.keys())}", file=sys.stderr)

        # Instantiate generator
        print("[EE-10 Wrapper] Instantiating EE10Generator", file=sys.stderr)
        generator = EE10Generator()

        # Generate document with doctor parameter
        print("[EE-10 Wrapper] Starting PDF generation...", file=sys.stderr)
        filename, pdf_bytes = generator.generate(client_record, doctor, form_data)

        pdf_size = len(pdf_bytes.getvalue())
        print(f"[EE-10 Wrapper] PDF generated successfully: {filename}, size: {pdf_size} bytes", file=sys.stderr)

        # Create success response
        response = create_response(
            success=True,
            filename=filename,
            pdf_data=pdf_bytes.getvalue()
        )

        print("[EE-10 Wrapper] Sending response to Node.js", file=sys.stderr)
        print(response)
        sys.exit(0)

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()

        print(f"[EE-10 Wrapper] ERROR: {str(e)}", file=sys.stderr)
        print(f"[EE-10 Wrapper] Stack trace:\n{error_trace}", file=sys.stderr)

        # Create error response
        error_response = create_response(
            success=False,
            error=f"{str(e)}\n\nStack trace:\n{error_trace}"
        )
        print(error_response, file=sys.stderr)
        sys.exit(1)