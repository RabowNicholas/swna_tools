from datetime import datetime
from io import BytesIO
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter


class AddressChangeGenerator:
    def __init__(self, template_path="templates/Address Change Template.pdf"):
        self.template_path = template_path

    def generate(self, client_record: dict, form_data: dict) -> tuple[str, BytesIO]:
        claimant_name = form_data.get("claimant_name", "")
        case_id = form_data.get("case_id", "")
        street_address = form_data.get("street_address", "")
        city = form_data.get("city", "")
        state = form_data.get("state", "")
        zip_code = form_data.get("zip_code", "")

        # Generate filename
        current_date = datetime.now().strftime("%m.%d.%y")
        name_for_filename = claimant_name.replace(",", "").replace(" ", "_")
        filename = f"Address_Change_{name_for_filename}_{current_date}.pdf"

        # Generate PDF
        pdf_bytes = self.draw_pdf(
            claimant_name,
            case_id,
            street_address,
            city,
            state,
            zip_code,
        )
        return filename, pdf_bytes

    def draw_pdf(
        self,
        claimant_name: str,
        case_id: str,
        street_address: str,
        city: str,
        state: str,
        zip_code: str,
    ) -> BytesIO:
        # Load the existing PDF template
        base_pdf = PdfReader(self.template_path)
        output = PdfWriter()

        for page_num, base_page in enumerate(base_pdf.pages):
            # Create overlay for this page
            overlay_buffer = BytesIO()
            overlay = canvas.Canvas(overlay_buffer, pagesize=letter)
            overlay.setFont("Times-Roman", 11)

            # Fill in the template fields based on the address change template structure
            # Claimant name at top
            overlay.drawString(116, 721, claimant_name)

            # Case ID
            overlay.drawString(110, 708, case_id)

            # Current date below case ID
            current_date = datetime.now().strftime("%B %d, %Y")
            overlay.drawString(72, 695, current_date)

            # Address information (assuming it goes in the middle section)
            # Street address
            overlay.drawString(112, 540, street_address)
            # City, State, Zip on next line
            full_address_line2 = f"{city}, {state} {zip_code}"
            overlay.drawString(112, 525, full_address_line2)

            # Replace "Mr. X" with the actual claimant name in the letter text
            overlay.drawString(
                620, 453, claimant_name.split()[0] if claimant_name else ""
            )

            # Save this page's overlay
            overlay.save()
            overlay_buffer.seek(0)

            # Merge overlay with base page
            overlay_pdf = PdfReader(overlay_buffer)
            if len(overlay_pdf.pages) > 0:
                overlay_page = overlay_pdf.pages[0]
                base_page.merge_page(overlay_page)

            output.add_page(base_page)

        result = BytesIO()
        output.write(result)
        result.seek(0)
        return result
