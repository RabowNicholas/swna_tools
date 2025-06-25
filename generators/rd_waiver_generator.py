from datetime import datetime
from io import BytesIO
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter


class RDAcceptWaiverGenerator:
    def __init__(self, template_path="templates/rd_accept_waiver.pdf"):
        self.template_path = template_path

    def generate(
        self,
        claimant: str,
        employee: str,
        case_id: str,
        rd_decision_date: str,
        current_date: str,
    ) -> tuple[str, BytesIO]:

        # filename format: RDAccept_F.Last_MM.DD.YY.pdf
        try:
            last, first = claimant.split(" ")[-1], claimant.split(" ")[0]
            short_date = datetime.now().strftime("%m.%d.%y")
            filename = f"RD_accept_waiver_{first[0]}.{last}_{short_date}.pdf"
        except Exception:
            filename = "RDAccept.pdf"

        pdf_bytes = self.draw_pdf(
            claimant, employee, case_id, rd_decision_date, current_date
        )
        return filename, pdf_bytes

    def draw_pdf(
        self, claimant, employee, case_id, rd_decision_date, current_date
    ) -> BytesIO:
        base_pdf = PdfReader(self.template_path)
        writer = PdfWriter()

        page = base_pdf.pages[0]
        overlay = self._make_overlay_page(
            claimant, employee, case_id, rd_decision_date, current_date
        )
        page.merge_page(overlay)
        writer.add_page(page)

        result = BytesIO()
        writer.write(result)
        result.seek(0)
        return result

    def _make_overlay_page(
        self, claimant, employee, case_id, rd_decision_date, current_date
    ):
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        c.setFont("Helvetica", 11)

        # Adjust these coordinates as needed
        c.drawString(410, 675, claimant)
        c.drawString(378, 662, employee)
        c.drawString(374, 647, case_id)
        c.drawString(410, 634, rd_decision_date)
        c.drawString(83, 247, claimant)
        c.drawString(315, 178, current_date)

        c.save()
        buffer.seek(0)
        return PdfReader(buffer).pages[0]
