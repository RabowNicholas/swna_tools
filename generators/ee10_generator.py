from datetime import datetime
from io import BytesIO
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter


class EE10Generator:
    def __init__(self, template_dir="templates", output_dir="output"):
        self.template_dir = template_dir
        self.output_dir = output_dir

    def generate(
        self, client_record: dict, doctor: str, form_data: dict
    ) -> tuple[str, BytesIO]:
        client_name = form_data.get("name", "")
        case_id = form_data.get("case_id", "")
        address_main = form_data.get("address_main", "")
        address_city = form_data.get("address_city", "")
        address_state = form_data.get("address_state", "")
        address_zip = form_data.get("address_zip", "")
        phone = form_data.get("phone", "")
        claim_type = form_data.get("claim_type", "")
        area_code = phone[:3]
        prefix = phone[4:7]
        line_number = phone[8:]

        # Select template
        template_name = (
            "EE-10_la_plata.pdf" if doctor == "La Plata" else "EE-10_lewis.pdf"
        )
        template_path = f"{self.template_dir}/{template_name}"

        # Suggested filename
        current_date = datetime.now().strftime("%m.%d.%y")
        try:
            first, last = client_name.strip().split(" ", 1)
            filename = f"EE10_{first[0]}.{last}_{current_date}.pdf"
        except ValueError:
            filename = f"EE10_{client_name}_{current_date}.pdf"

        # Draw and return in-memory PDF
        pdf_bytes = self.draw_pdf(
            template_path,
            client_name,
            case_id,
            address_main,
            address_city,
            address_state,
            address_zip,
            area_code,
            prefix,
            line_number,
            claim_type,
        )
        return filename, pdf_bytes

    def draw_pdf(
        self,
        template_path: str,
        client_name: str,
        case_id: str,
        address_main: str,
        address_city: str,
        address_state: str,
        address_zip: str,
        area_code: str,
        prefix: str,
        line_number: str,
        claim_type: str,
    ):

        # Load the existing PDF
        base_pdf = PdfReader(template_path)
        base_page = base_pdf.pages[0]

        # Create a new PDF to overlay text
        overlay_buffer = BytesIO()
        overlay = canvas.Canvas(overlay_buffer, pagesize=letter)
        overlay.setFont("Helvetica", 12)
        overlay.drawString(25, 644, client_name)
        overlay.drawString(460, 644, case_id)
        overlay.drawString(412, 70, datetime.now().strftime("%m/%d/%Y"))
        # Draw address and phone
        overlay.drawString(25, 587, address_main)
        overlay.drawString(25, 555, address_city)
        overlay.drawString(220, 555, address_state)
        overlay.drawString(255, 555, address_zip)
        overlay.drawString(355, 612, area_code)
        overlay.drawString(390, 612, prefix)
        overlay.drawString(425, 612, line_number)
        # Draw X depending on claim_type
        if claim_type == "Initial Impairment Claim":
            overlay.drawString(27, 487, "X")
        elif claim_type == "Repeat Impairment Claim":
            overlay.drawString(27, 375, "X")
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
