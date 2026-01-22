"""
IR Notice Generator
Generates IR Schedule Notice letters with provider selection
"""

from datetime import datetime
from io import BytesIO
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter


class IRNoticeGenerator:
    def __init__(self, template_path="web/public/templates/ir_notice_la_plata.pdf"):
        self.template_path = template_path

    def format_date(self, date_value, format_str="%B %d, %Y"):
        """Helper function to format dates that could be strings or datetime objects"""
        if not date_value:
            return ""

        if isinstance(date_value, str):
            try:
                # Try YYYY-MM-DD format first (from frontend)
                date_obj = datetime.strptime(date_value, "%Y-%m-%d")
                return date_obj.strftime(format_str)
            except ValueError:
                try:
                    # Try M/D/Y format
                    date_obj = datetime.strptime(date_value, "%m/%d/%Y")
                    return date_obj.strftime(format_str)
                except ValueError:
                    return str(date_value)  # Fallback to original string
        else:
            # Assume it's already a datetime object
            return date_value.strftime(format_str)

    def format_current_date(self):
        """Format the current date for the letter header (e.g., 'January 22, 2026')"""
        return datetime.now().strftime("%B %d, %Y")

    def generate(
        self,
        client_name: str,
        file_number: str,
        appointment_date: str,
        provider_name: str = "La Plata Medical",
    ) -> tuple[str, BytesIO]:
        """
        Generate IR Notice PDF

        Args:
            client_name: Client's full name
            file_number: Case/file number
            appointment_date: Date of IR appointment (YYYY-MM-DD or other format)
            provider_name: Name of the medical provider (default: "La Plata Medical")

        Returns:
            Tuple of (filename, BytesIO containing PDF bytes)
        """
        # Generate filename
        current_date = datetime.now().strftime("%m.%d.%y")
        name_for_filename = client_name.replace(" ", "_")
        filename = f"IR_Notice_{name_for_filename}_{current_date}.pdf"

        # Generate PDF
        pdf_bytes = self.draw_pdf(
            client_name,
            file_number,
            appointment_date,
            provider_name,
        )
        return filename, pdf_bytes

    def draw_pdf(
        self,
        client_name: str,
        file_number: str,
        appointment_date: str,
        provider_name: str,
    ) -> BytesIO:
        """Draw all fields onto the PDF template"""
        # Load the existing PDF
        base_pdf = PdfReader(self.template_path)
        base_page = base_pdf.pages[0]

        # Create overlay for text
        overlay_buffer = BytesIO()
        overlay = canvas.Canvas(overlay_buffer, pagesize=letter)
        overlay.setFont("Times-Roman", 11)

        # Format dates
        current_date_formatted = self.format_current_date()
        appointment_date_formatted = self.format_date(appointment_date)

        # Draw fields at coordinates matching TypeScript generator
        # Client name (x: 112, y: 711)
        overlay.drawString(114, 711, client_name)

        # File number (x: 98, y: 698)
        overlay.drawString(107, 698, file_number)

        # Current date line (x: 69, y: 685)
        overlay.drawString(69, 685, current_date_formatted)

        # Provider name - after "with" (x: 409, y: 546) - positioned after "an Impairment Rating appointment with"
        overlay.drawString(387, 555, provider_name)

        # Appointment date with period - after "for" (x: 69, y: 533)
        overlay.drawString(85, 525, appointment_date_formatted + ".")

        # Save overlay
        overlay.save()
        overlay_buffer.seek(0)

        # Merge overlay with base page
        overlay_pdf = PdfReader(overlay_buffer)
        overlay_page = overlay_pdf.pages[0]

        output = PdfWriter()
        base_page.merge_page(overlay_page)
        output.add_page(base_page)

        result = BytesIO()
        output.write(result)
        result.seek(0)
        return result
