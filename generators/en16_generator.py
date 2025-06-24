from datetime import datetime
from io import BytesIO
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter


class EN16Generator:
    def __init__(self, template_path="templates/en-16.pdf"):
        self.template_path = template_path

    def generate(self, client_record: dict) -> tuple[str, BytesIO]:
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

        current_date = datetime.now().strftime("%m.%d.%y")
        filename = f"EN16_{first[0]}.{last}_{current_date}.pdf"

        pdf_bytes = self.draw_pdf(self.template_path, client_name, case_id)
        return filename, pdf_bytes

    def draw_pdf(self, template_path: str, client_name: str, case_id: str) -> BytesIO:
        base_pdf = PdfReader(template_path)
        writer = PdfWriter()

        # First page: name + case ID
        overlay_page_1 = self._make_overlay_page(
            client_name=client_name,
            case_id=case_id,
            draw_date=False,
        )
        first_page = base_pdf.pages[0]
        first_page.merge_page(overlay_page_1)
        writer.add_page(first_page)

        # Middle pages (no overlay)
        for i in range(1, len(base_pdf.pages) - 1):
            writer.add_page(base_pdf.pages[i])

        # Last page: current date only
        overlay_last = self._make_overlay_page(
            client_name=None,
            case_id=None,
            draw_date=True,
        )
        last_page = base_pdf.pages[-1]
        last_page.merge_page(overlay_last)
        writer.add_page(last_page)

        result = BytesIO()
        writer.write(result)
        result.seek(0)
        return result

    def _make_overlay_page(self, client_name=None, case_id=None, draw_date=False):
        overlay_buffer = BytesIO()
        overlay = canvas.Canvas(overlay_buffer, pagesize=letter)
        overlay.setFont("Helvetica", 12)
        if client_name and case_id:
            overlay.drawString(355, 695, client_name)
            overlay.drawString(355, 710, case_id)
        if draw_date:
            overlay.drawString(250, 227, datetime.now().strftime("%m/%d/%Y"))
        overlay.save()
        overlay_buffer.seek(0)
        return PdfReader(overlay_buffer).pages[0]
