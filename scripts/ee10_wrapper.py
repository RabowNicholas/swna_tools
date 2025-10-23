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
        # Read JSON input from stdin
        input_data = json.loads(sys.stdin.read())

        client_record = input_data.get('client_record', {})
        form_data = input_data.get('form_data', {})
        doctor = input_data.get('doctor', 'La Plata')  # Extract doctor parameter

        # Instantiate generator
        generator = EE10Generator()

        # Generate document with doctor parameter
        filename, pdf_bytes = generator.generate(client_record, doctor, form_data)

        # Create success response
        response = create_response(
            success=True,
            filename=filename,
            pdf_data=pdf_bytes.getvalue()
        )

        print(response)
        sys.exit(0)

    except Exception as e:
        # Create error response
        error_response = create_response(
            success=False,
            error=str(e)
        )
        print(error_response, file=sys.stderr)
        sys.exit(1)