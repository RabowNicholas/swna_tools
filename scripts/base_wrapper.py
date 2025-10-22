#!/usr/bin/env python3
"""
Base wrapper script for Next.js integration with Python generators.
Provides common functionality for all generator wrappers.
"""

import sys
import json
import base64
import traceback
import os
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def create_response(success=True, filename=None, pdf_data=None, error=None, warnings=None):
    """Create standardized response for Next.js API consumption."""
    response = {
        "success": success,
        "timestamp": str(sys.stderr.write(f"Process started\n") or ""),
    }
    
    if success:
        response.update({
            "filename": filename,
            "pdf_data": base64.b64encode(pdf_data).decode('utf-8') if pdf_data else None,
            "content_type": "application/pdf"
        })
        if warnings:
            response["warnings"] = warnings
    else:
        response["error"] = error
    
    return response

def handle_generator_execution(generator_class, generator_args=None):
    """
    Generic handler for generator execution.
    
    Args:
        generator_class: The generator class to instantiate
        generator_args: Optional arguments for generator constructor
    """
    try:
        # Read JSON input from stdin
        input_data = json.loads(sys.stdin.read())
        
        client_record = input_data.get('client_record', {})
        form_data = input_data.get('form_data', {})
        
        # Instantiate generator
        if generator_args:
            generator = generator_class(**generator_args)
        else:
            generator = generator_class()
        
        # Generate document
        filename, pdf_bytes = generator.generate(client_record, form_data)
        
        # Create success response
        response = create_response(
            success=True,
            filename=filename,
            pdf_data=pdf_bytes.getvalue()
        )
        
        print(json.dumps(response))
        
    except Exception as e:
        # Create error response
        error_response = create_response(
            success=False,
            error=str(e)
        )
        
        # Log full traceback to stderr for debugging
        traceback.print_exc(file=sys.stderr)
        
        print(json.dumps(error_response))
        sys.exit(1)

if __name__ == "__main__":
    print("Base wrapper - should not be called directly", file=sys.stderr)
    sys.exit(1)