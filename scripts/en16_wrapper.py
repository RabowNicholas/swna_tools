#!/usr/bin/env python3
"""
EN-16 Generator wrapper for Next.js integration.
"""

import sys
import json
import base64
import traceback
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from generators.en16_generator import EN16Generator


def create_response(success=True, filename=None, pdf_data=None, error=None):
    """Create standardized response for Next.js API consumption."""
    response = {"success": success}

    if success:
        response.update(
            {
                "filename": filename,
                "pdf_data": (
                    base64.b64encode(pdf_data).decode("utf-8") if pdf_data else None
                ),
                "content_type": "application/pdf",
            }
        )
    else:
        response["error"] = error

    return response


if __name__ == "__main__":
    try:
        # Read JSON input from stdin
        input_data = json.loads(sys.stdin.read())

        form_data = input_data.get("form_data", {})

        # Extract required fields
        claimant = form_data.get("claimant", "")
        case_id = form_data.get("case_id", "")

        if not claimant or not case_id:
            raise ValueError("Missing required fields: claimant and case_id")

        # Generate document
        generator = EN16Generator()
        filename, pdf_bytes = generator.generate(claimant, case_id)

        # Create success response
        response = create_response(
            success=True, filename=filename, pdf_data=pdf_bytes.getvalue()
        )

        print(json.dumps(response))

    except Exception as e:
        # Create error response
        error_response = create_response(success=False, error=str(e))

        # Log full traceback to stderr for debugging
        traceback.print_exc(file=sys.stderr)

        print(json.dumps(error_response))
        sys.exit(1)
