from datetime import datetime
from io import BytesIO

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from PyPDF2 import PdfReader, PdfWriter


class LaPlataNoticeGenerator:
    def generate(
        self, client_name: str, file_number: str, appointment_date: str
    ) -> tuple[str, BytesIO]:
        template_path = "templates/ir_notice_la_plata.pdf"

        # Load the base template
        base_pdf = PdfReader(template_path)
        base_page = base_pdf.pages[0]

        # Create overlay
        overlay_buffer = BytesIO()
        overlay = canvas.Canvas(overlay_buffer, pagesize=letter)
        overlay.setFont("Times-Roman", 11)
        overlay.drawString(112, 711, client_name)
        overlay.drawString(98, 698, file_number)
        overlay.drawString(70, 526, appointment_date)
        overlay.save()
        overlay_buffer.seek(0)

        overlay_pdf = PdfReader(overlay_buffer)
        overlay_page = overlay_pdf.pages[0]

        output = PdfWriter()
        base_page.merge_page(overlay_page)
        output.add_page(base_page)

        result = BytesIO()
        output.write(result)
        result.seek(0)

        filename = f"LaPlata_Notice_{client_name.replace(' ', '_')}_{datetime.now().strftime('%m.%d.%y')}.pdf"
        return filename, result
