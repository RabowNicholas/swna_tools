import datetime
from io import BytesIO
import os
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

TEMPLATE_PATH_LEWIS = "app/templates/EN-11a Lewis.pdf"
TEMPLATE_PATH_LAPLATA = "app/templates/EN-11a Kalcich.pdf"


def fill_en11a_pdf(data, output_path):
    try:
        template_path = (
            TEMPLATE_PATH_LEWIS
            if data.get("doctor") == "Dr. Lewis"
            else TEMPLATE_PATH_LAPLATA
        )
        # Load base template
        base_pdf = PdfReader(template_path)
        base_page = base_pdf.pages[0]

        # Generate overlay in-memory
        packet = BytesIO()
        c = canvas.Canvas(packet, pagesize=letter)
        c.setFont("Helvetica", 12)
        c.setFillColorRGB(0, 0, 0)

        if data.get("doctor") == "Dr. Lewis":
            c.drawString(175, 696, data.get("case_id", ""))
            c.drawString(175, 682, data.get("employee_name", ""))
            c.drawString(400, 335, datetime.datetime.now().strftime("%m/%d/%Y"))
        else:
            c.drawString(178, 704, data.get("case_id", ""))
            c.drawString(178, 691, data.get("employee_name", ""))
            c.drawString(400, 317, datetime.datetime.now().strftime("%m/%d/%Y"))
        c.save()
        packet.seek(0)

        # Read overlay as PDF
        overlay_pdf = PdfReader(packet)
        overlay_page = overlay_pdf.pages[0]

        # Merge overlay onto base
        base_page.merge_page(overlay_page)

        writer = PdfWriter()
        writer.add_page(base_page)

        with open(output_path, "wb") as f:
            writer.write(f)

        return output_path

    except Exception as e:
        print(f"Error generating EN-11a form: {e}")
        return None
