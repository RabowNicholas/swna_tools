from datetime import datetime
from io import BytesIO
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from PIL import Image


class EE1Generator:
    def __init__(self, template_path="templates/EE-1.pdf"):
        self.template_path = template_path

    def generate(self, client_record: dict, form_data: dict) -> tuple[str, BytesIO]:
        first_name = form_data.get("first_name", "")
        last_name = form_data.get("last_name", "")
        name = f"{last_name}, {first_name}" if last_name and first_name else ""
        ssn = form_data.get("ssn", "")
        dob = form_data.get("dob")
        sex = form_data.get("sex", "")
        address_main = form_data.get("address_main", "")
        address_city = form_data.get("address_city", "")
        address_state = form_data.get("address_state", "")
        address_zip = form_data.get("address_zip", "")
        phone = form_data.get("phone", "")
        diagnosis_categories = form_data.get("diagnosis_categories", {})
        signature_file = form_data.get("signature_file")

        # Parse phone number
        phone_clean = phone.replace(".", "").replace("-", "").replace(" ", "")
        area_code = phone_clean[:3] if len(phone_clean) >= 3 else ""
        prefix = phone_clean[3:6] if len(phone_clean) >= 6 else ""
        line_number = phone_clean[6:10] if len(phone_clean) >= 10 else ""

        # Generate filename
        current_date = datetime.now().strftime("%m.%d.%y")
        if first_name and last_name:
            filename = f"EE1_{first_name[0]}.{last_name}_{current_date}.pdf"
        else:
            filename = f"EE1_Unknown_{current_date}.pdf"

        # Generate PDF
        pdf_bytes = self.draw_pdf(
            last_name,
            first_name,
            ssn,
            dob,
            sex,
            address_main,
            address_city,
            address_state,
            address_zip,
            area_code,
            prefix,
            line_number,
            diagnosis_categories,
            signature_file,
        )
        return filename, pdf_bytes

    def draw_pdf(
        self,
        last_name: str,
        first_name: str,
        ssn: str,
        dob,
        sex: str,
        address_main: str,
        address_city: str,
        address_state: str,
        address_zip: str,
        area_code: str,
        prefix: str,
        line_number: str,
        diagnosis_categories: dict,
        signature_file,
    ) -> BytesIO:
        # Load the existing PDF
        base_pdf = PdfReader(self.template_path)
        base_page = base_pdf.pages[0]

        # Create two overlays: one for signatures (behind), one for marks (on top)
        signature_overlay_buffer = BytesIO()
        signature_overlay = canvas.Canvas(signature_overlay_buffer, pagesize=letter)
        signature_overlay.setFont("Helvetica", 10)

        marks_overlay_buffer = BytesIO()
        marks_overlay = canvas.Canvas(marks_overlay_buffer, pagesize=letter)
        marks_overlay.setFont("Helvetica", 10)

        # NOTE: These coordinates are placeholders and will need to be adjusted
        # based on the actual EE-1 PDF template layout

        # Basic form data goes on signature overlay (behind form)
        # Name (Last, First)
        signature_overlay.drawString(25, 645, last_name)
        signature_overlay.drawString(185, 645, first_name)

        # Social Security Number
        signature_overlay.drawString(400, 645, ssn)

        # Date of Birth
        if dob:
            dob_str = dob.strftime("%m      %d      %Y")
            signature_overlay.drawString(95, 627, dob_str)

        # Address
        signature_overlay.drawString(25, 585, address_main)
        signature_overlay.drawString(25, 555, address_city)
        signature_overlay.drawString(215, 555, address_state)
        signature_overlay.drawString(255, 555, address_zip)

        # Phone number
        signature_overlay.drawString(355, 585, area_code)
        signature_overlay.drawString(390, 585, prefix)
        signature_overlay.drawString(428, 585, line_number)

        # Sex checkbox goes on marks overlay (on top)
        if sex == "Male":
            marks_overlay.drawString(203, 615, "X")
        else:
            marks_overlay.drawString(247, 615, "X")

        # Diagnosis Categories Section - Section 8
        # Based on EE-1 template coordinates (these will need fine-tuning)

        # Cancer checkbox and listings
        if diagnosis_categories.get("cancer", {}).get("selected"):
            # Check Cancer checkbox (on top layer)
            marks_overlay.drawString(22, 518, "X")  # Cancer checkbox position

            # Cancer specific diagnoses (a, b, c) with individual dates
            cancer_diagnoses = diagnosis_categories["cancer"].get(
                "diagnoses",
                [
                    {"text": "", "date": None},
                    {"text": "", "date": None},
                    {"text": "", "date": None},
                ],
            )
            y_positions = [495, 478, 459]  # Approximate y positions for a, b, c
            date_y_positions = [
                495,
                478,
                459,
            ]  # Date positions for each cancer diagnosis

            for i, diagnosis in enumerate(cancer_diagnoses):
                if diagnosis.get("text") and i < 3:
                    signature_overlay.drawString(55, y_positions[i], diagnosis["text"])

                    # Individual date for each cancer diagnosis
                    if diagnosis.get("date"):
                        date_str = diagnosis["date"].strftime("%m       %d       %Y")
                        signature_overlay.drawString(507, date_y_positions[i], date_str)

        # Beryllium Sensitivity
        if diagnosis_categories.get("beryllium_sensitivity", {}).get("selected"):
            marks_overlay.drawString(22, 443, "X")  # Beryllium Sensitivity checkbox
            if diagnosis_categories["beryllium_sensitivity"].get("date"):
                date_str = diagnosis_categories["beryllium_sensitivity"][
                    "date"
                ].strftime("%m       %d       %Y")
                signature_overlay.drawString(507, 441, date_str)

        # Chronic Beryllium Disease (CBD)
        if diagnosis_categories.get("chronic_beryllium_disease", {}).get("selected"):
            marks_overlay.drawString(22, 425, "X")  # CBD checkbox
            if diagnosis_categories["chronic_beryllium_disease"].get("date"):
                date_str = diagnosis_categories["chronic_beryllium_disease"][
                    "date"
                ].strftime("%m       %d       %Y")
                signature_overlay.drawString(507, 423, date_str)

        # Chronic Silicosis
        if diagnosis_categories.get("chronic_silicosis", {}).get("selected"):
            marks_overlay.drawString(22, 407, "X")  # Chronic Silicosis checkbox
            if diagnosis_categories["chronic_silicosis"].get("date"):
                date_str = diagnosis_categories["chronic_silicosis"]["date"].strftime(
                    "%m       %d       %Y"
                )
                signature_overlay.drawString(507, 405, date_str)

        # Other Work-Related Conditions
        if diagnosis_categories.get("other", {}).get("selected"):
            marks_overlay.drawString(22, 388, "X")  # Other conditions checkbox

            # Other specific diagnoses (a, b, c) with individual dates
            other_diagnoses = diagnosis_categories["other"].get(
                "diagnoses",
                [
                    {"text": "", "date": None},
                    {"text": "", "date": None},
                    {"text": "", "date": None},
                ],
            )
            y_positions = [370, 352, 335]  # Approximate y positions for a, b, c

            for i, diagnosis in enumerate(other_diagnoses):
                if diagnosis.get("text") and i < 3:
                    signature_overlay.drawString(55, y_positions[i], diagnosis["text"])

                    # Individual date for each other diagnosis
                    if diagnosis.get("date"):
                        date_str = diagnosis["date"].strftime("%m       %d       %Y")
                        signature_overlay.drawString(507, y_positions[i], date_str)

        # Signature handling (optional)
        if signature_file:
            try:
                # Process the signature image
                signature_image = Image.open(signature_file)

                # Resize signature to reasonable size (adjust as needed)
                max_width, max_height = 150, 50
                signature_image.thumbnail(
                    (max_width, max_height), Image.Resampling.LANCZOS
                )

                # Convert to RGB if necessary
                if signature_image.mode in ("RGBA", "LA", "P"):
                    signature_image = signature_image.convert("RGB")

                # Create temporary buffer for signature
                sig_buffer = BytesIO()
                signature_image.save(sig_buffer, format="JPEG")
                sig_buffer.seek(0)

                # Add signature to signature overlay (behind form)
                signature_overlay.drawImage(
                    ImageReader(sig_buffer),
                    103,  # x position
                    33,  # y position
                    width=signature_image.width,
                    height=signature_image.height,
                )
            except Exception as e:
                # If signature processing fails, add text placeholder
                signature_overlay.drawString(100, 155, "[Signature processing failed]")
        # No else clause needed - signature is optional

        # Add current date to the right of signature
        from datetime import datetime

        current_date = datetime.now().strftime("%m/%d/%Y")
        signature_overlay.drawString(
            390, 42, current_date
        )  # Date position next to signature

        # Save both overlays
        signature_overlay.save()
        signature_overlay_buffer.seek(0)

        marks_overlay.save()
        marks_overlay_buffer.seek(0)

        # Create the layered PDF: signature overlay (behind) + template + marks overlay (on top)
        signature_pdf = PdfReader(signature_overlay_buffer)
        signature_page = signature_pdf.pages[0]

        marks_pdf = PdfReader(marks_overlay_buffer)
        marks_page = marks_pdf.pages[0]

        output = PdfWriter()
        # Layer 1: signature overlay (behind)
        signature_page.merge_page(base_page)
        # Layer 2: marks overlay (on top)
        signature_page.merge_page(marks_page)
        output.add_page(signature_page)

        result = BytesIO()
        output.write(result)
        result.seek(0)
        return result
