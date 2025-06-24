from datetime import datetime
from io import BytesIO
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter


class EN11AGenerator:
    def __init__(self, template_dir="templates", output_dir="output"):
        self.template_dir = template_dir
        self.output_dir = output_dir

    def generate(self, client_record: dict, doctor: str) -> tuple[str, BytesIO]:
        raw_name = client_record["fields"].get("Name", "")
        try:
            case_id = client_record["fields"].get("Case ID", "")
            last_first = raw_name.split(" - ")[0]
            last, first = [s.strip() for s in last_first.split(",")]
            client_name = f"{first} {last}"
        except ValueError:
            raise ValueError(
                "Client name format invalid. Expected 'Last, First - ####'"
            )

        # Select template
        template_name = (
            "en11a_kalcich.pdf" if doctor == "Dr. Kalcich" else "en11a_lewis.pdf"
        )
        template_path = f"{self.template_dir}/{template_name}"

        # Suggested filename
        current_date = datetime.now().strftime("%m.%d.%y")
        filename = f"EN11A_{first[0]}.{last}_{current_date}.pdf"

        # Draw and return in-memory PDF
        pdf_bytes = self.draw_pdf(template_path, client_name, case_id)
        return filename, pdf_bytes

    def draw_pdf(
        self,
        template_path: str,
        client_name: str,
        case_id: str,
    ):

        # Load the existing PDF
        base_pdf = PdfReader(template_path)
        base_page = base_pdf.pages[0]

        # Create a new PDF to overlay text
        overlay_buffer = BytesIO()
        overlay = canvas.Canvas(overlay_buffer, pagesize=letter)
        overlay.setFont("Helvetica", 12)
        if "kalcich" in template_path:
            overlay.drawString(180, 690, client_name)
            overlay.drawString(180, 705, case_id)
            overlay.drawString(400, 320, datetime.now().strftime("%m/%d/%Y"))
        else:
            overlay.drawString(178, 681, client_name)
            overlay.drawString(178, 696, case_id)
            overlay.drawString(400, 333, datetime.now().strftime("%m/%d/%Y"))
        overlay.save()
        overlay_buffer.seek(0)

        # Merge overlay onto template
        overlay_pdf = PdfReader(overlay_buffer)
        overlay_page = overlay_pdf.pages[0]

        output = PdfWriter()
        base_page.merge_page(overlay_page)
        output.add_page(base_page)

        result = BytesIO()
        output.write(result)
        result.seek(0)
        return result
