from http.server import BaseHTTPRequestHandler
import json
import sys
import base64
import traceback
from pathlib import Path

# Add project root to path (api is at root level)
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from generators.ee10_generator import EE10Generator

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        """Handle POST request for PDF generation"""
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            input_data = json.loads(body.decode('utf-8'))

            client_record = input_data.get('client_record', {})
            form_data = input_data.get('form_data', {})
            doctor = input_data.get('doctor', 'La Plata')

            # Generate PDF
            generator = EE10Generator()
            filename, pdf_bytes = generator.generate(client_record, doctor, form_data)

            # Return response
            response = {
                'success': True,
                'filename': filename,
                'pdf_data': base64.b64encode(pdf_bytes.getvalue()).decode('utf-8')
            }

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())

        except Exception as e:
            error_response = {
                'success': False,
                'error': str(e),
                'trace': traceback.format_exc()
            }

            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(error_response).encode())
