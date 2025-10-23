from datetime import datetime
from io import BytesIO
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from PIL import Image


class EE1AGenerator:
    def __init__(self, template_path="templates/EE-1a.pdf"):
        self.template_path = template_path

    def generate(self, client_record: dict, form_data: dict) -> tuple[str, BytesIO]:
        first_name = form_data.get("first_name", "")
        last_name = form_data.get("last_name", "")
        case_id = form_data.get("case_id", "")
        address_main = form_data.get("address_main", "")
        address_city = form_data.get("address_city", "")
        address_state = form_data.get("address_state", "")
        address_zip = form_data.get("address_zip", "")
        phone = form_data.get("phone", "")
        diagnoses = form_data.get("diagnoses", [])
        signature_file = form_data.get("signature_file")

        # Parse phone number
        phone_clean = phone.replace(".", "").replace("-", "").replace(" ", "")
        area_code = phone_clean[:3] if len(phone_clean) >= 3 else ""
        prefix = phone_clean[3:6] if len(phone_clean) >= 6 else ""
        line_number = phone_clean[6:10] if len(phone_clean) >= 10 else ""

        # Generate filename
        current_date = datetime.now().strftime("%m.%d.%y")
        if first_name and last_name:
            filename = f"EE1a_{first_name[0]}.{last_name}_{current_date}.pdf"
        else:
            filename = f"EE1a_Unknown_{current_date}.pdf"

        # Generate PDF
        pdf_bytes = self.draw_pdf(
            last_name,
            first_name,
            case_id,
            address_main,
            address_city,
            address_state,
            address_zip,
            area_code,
            prefix,
            line_number,
            diagnoses,
            signature_file,
        )
        return filename, pdf_bytes

    def draw_pdf(
        self,
        last_name: str,
        first_name: str,
        case_id: str,
        address_main: str,
        address_city: str,
        address_state: str,
        address_zip: str,
        area_code: str,
        prefix: str,
        line_number: str,
        diagnoses: list,
        signature_file,
    ) -> BytesIO:
        # Load the existing PDF
        base_pdf = PdfReader(self.template_path)
        base_page = base_pdf.pages[0]

        # Create overlay
        overlay_buffer = BytesIO()
        overlay = canvas.Canvas(overlay_buffer, pagesize=letter)
        overlay.setFont("Helvetica", 10)

        # Accurate coordinates based on EE-1a grid mapping

        # 1. Name (Last, First, Middle Initial) - separate fields like EE1
        overlay.drawString(25, 615, last_name)
        overlay.drawString(185, 615, first_name)

        # 2. Case ID Number
        overlay.drawString(400, 615, case_id)

        # 3. Address (Street, Apt. #, P.O. Box)
        overlay.drawString(25, 582, address_main)

        # 3. Address (City, State, ZIP Code) - separate fields like EE1
        overlay.drawString(25, 555, address_city)  # City
        overlay.drawString(215, 555, address_state)  # State
        overlay.drawString(255, 555, address_zip)  # ZIP

        # 4. Telephone Numbers
        # 4a. Home phone - position in the parentheses and dashes (using EE1 coordinates)
        if area_code:
            overlay.drawString(355, 583, area_code)  # Inside the ( ) for area code
        if prefix:
            overlay.drawString(390, 583, prefix)  # Before the dash
        if line_number:
            overlay.drawString(428, 583, line_number)  # After the dash

        # 5. Diagnoses - accurate positioning for fields a-e
        diagnosis_y_positions = [496, 479, 461, 443, 426]  # a, b, c, d, e
        for i, diagnosis in enumerate(diagnoses):
            if i < 5:  # Only 5 fields available (a-e)
                y_pos = diagnosis_y_positions[i]
                # Support both old format (diagnosis) and new format (diagnosis_text)
                diagnosis_text = diagnosis.get("diagnosis_text") or diagnosis.get("diagnosis", "")
                overlay.drawString(33, y_pos, diagnosis_text)

                # 6. Date of Diagnosis (Month, Day, Year)
                # Support both old format (date as datetime) and new format (diagnosis_date as string)
                date_value = diagnosis.get("diagnosis_date") or diagnosis.get("date")
                if date_value:
                    # If it's a string, parse it
                    if isinstance(date_value, str):
                        try:
                            date_obj = datetime.strptime(date_value, "%Y-%m-%d")
                        except ValueError:
                            continue
                    else:
                        date_obj = date_value

                    # Split into separate fields as shown in template
                    overlay.drawString(510, y_pos, f"{date_obj.month:02d}")  # Month
                    overlay.drawString(543, y_pos, f"{date_obj.day:02d}")  # Day
                    overlay.drawString(568, y_pos, f"{date_obj.year}")  # Year

        # Signature handling
        if signature_file:
            try:
                # Process the signature image
                signature_image = Image.open(signature_file)

                # Calculate scaling to fit signature area while maintaining aspect ratio
                # Signature area: approximately 200 width x 60 height points
                max_width, max_height = 200, 60

                # Get original dimensions
                orig_width, orig_height = signature_image.size

                # Calculate scale factor to fit within bounds while maintaining aspect ratio
                width_scale = max_width / orig_width
                height_scale = max_height / orig_height
                scale = min(width_scale, height_scale)

                # Only resize if image is larger than the target area
                if scale < 1:
                    new_width = int(orig_width * scale)
                    new_height = int(orig_height * scale)
                    signature_image = signature_image.resize(
                        (new_width, new_height),
                        Image.Resampling.LANCZOS
                    )

                # Convert to RGB if necessary (for PDF compatibility)
                if signature_image.mode in ("RGBA", "LA", "P"):
                    # Create white background for transparency
                    background = Image.new("RGB", signature_image.size, (255, 255, 255))
                    if signature_image.mode == "RGBA":
                        background.paste(signature_image, mask=signature_image.split()[3])
                    else:
                        background.paste(signature_image)
                    signature_image = background

                # Create temporary buffer for signature - use PNG for better quality
                sig_buffer = BytesIO()
                signature_image.save(sig_buffer, format="PNG", optimize=False)
                sig_buffer.seek(0)

                # Add signature to PDF - positioned in Claimant Signature field
                overlay.drawImage(
                    ImageReader(sig_buffer),
                    108,  # x position - aligned with other fields
                    165,  # y position - in signature area
                    width=signature_image.width,
                    height=signature_image.height,
                    preserveAspectRatio=True,
                )
            except Exception as e:
                # If signature processing fails, add text placeholder
                overlay.drawString(85, 185, "[Signature processing failed]")

        # Add current date next to signature (like EE1)
        current_date = datetime.now().strftime("%m/%d/%Y")
        overlay.drawString(385, 175, current_date)  # Date position next to signature

        overlay.save()
        overlay_buffer.seek(0)

        # Merge template onto overlay (so signature appears behind form elements)
        overlay_pdf = PdfReader(overlay_buffer)
        overlay_page = overlay_pdf.pages[0]

        output = PdfWriter()
        overlay_page.merge_page(base_page)
        output.add_page(overlay_page)

        result = BytesIO()
        output.write(result)
        result.seek(0)
        return result
