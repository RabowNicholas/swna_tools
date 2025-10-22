#!/usr/bin/env python3
"""
Invoice Generator wrapper for Next.js integration.
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from scripts.base_wrapper import handle_generator_execution
from generators.invoice_generator import generate_invoice_file
import json

def handle_invoice_generation():
    """Custom handler for invoice generation since it uses a function, not a class."""
    try:
        # Read JSON input from stdin
        input_data = json.loads(sys.stdin.read())
        
        # Invoice generator expects the form data directly
        invoice_data = input_data.get('form_data', {})
        
        # Generate invoice
        filename, file_bytes = generate_invoice_file(invoice_data)
        
        # Create success response
        import base64
        response = {
            "success": True,
            "filename": filename,
            "pdf_data": base64.b64encode(file_bytes.getvalue()).decode('utf-8'),
            "content_type": "application/pdf"
        }
        
        print(json.dumps(response))
        
    except Exception as e:
        import traceback
        # Create error response
        error_response = {
            "success": False,
            "error": str(e)
        }
        
        # Log full traceback to stderr for debugging
        traceback.print_exc(file=sys.stderr)
        
        print(json.dumps(error_response))
        sys.exit(1)

if __name__ == "__main__":
    handle_invoice_generation()