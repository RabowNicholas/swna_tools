from datetime import datetime
from io import BytesIO
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter


class WithdrawalLetterGenerator:
    def __init__(self, template_path="templates/withdraw_letter.pdf"):
        self.template_path = template_path

    def generate(self, client_record: dict, form_data: dict) -> tuple[str, BytesIO]:
        claimant_name = form_data.get("claimant_name", "")
        case_id = form_data.get("case_id", "")
        letter_date = form_data.get("letter_date")
        claimed_condition = form_data.get("claimed_condition", "")

        # Generate filename
        current_date = datetime.now().strftime("%m.%d.%y")
        name_for_filename = claimant_name.replace(",", "").replace(" ", "_")
        filename = f"Withdrawal_Letter_{name_for_filename}_{current_date}.pdf"

        # Generate PDF
        pdf_bytes = self.draw_pdf(
            claimant_name,
            case_id,
            letter_date,
            claimed_condition,
        )
        return filename, pdf_bytes

    def draw_pdf(
        self,
        claimant_name: str,
        case_id: str,
        letter_date,
        claimed_condition: str,
    ) -> BytesIO:
        # Load the existing PDF template
        base_pdf = PdfReader(self.template_path)
        output = PdfWriter()

        # Format the date as "Month DD, YYYY"
        if letter_date:
            formatted_date = letter_date.strftime("%B %d, %Y")
        else:
            formatted_date = datetime.now().strftime("%B %d, %Y")

        for page_num, base_page in enumerate(base_pdf.pages):
            # Create overlay for this page
            overlay_buffer = BytesIO()
            overlay = canvas.Canvas(overlay_buffer, pagesize=letter)
            overlay.setFont("Times-Roman", 11)

            # Fill in the template fields based on the letter template structure
            # Claimant name at top
            overlay.drawString(119, 709, claimant_name)

            # Case ID
            overlay.drawString(113, 696, case_id)

            # Date
            overlay.drawString(74, 684, formatted_date)

            # Claimed condition
            overlay.drawString(260, 537, f"{claimed_condition}.")  # "claim for X"

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
