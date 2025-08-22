from datetime import datetime
from io import BytesIO
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter


class DesertPulmReferralGenerator:
    def __init__(self, template_path="templates/desert_pulm_la_plata_ref.pdf"):
        self.template_path = template_path

    def generate(self, client_record: dict, form_data: dict) -> tuple[str, BytesIO]:
        patient_name = form_data.get("patient_name", "")
        phone_number = form_data.get("phone_number", "")
        dob = form_data.get("dob")
        case_id = form_data.get("case_id", "")
        address_main = form_data.get("address_main", "")
        address_city = form_data.get("address_city", "")
        address_state = form_data.get("address_state", "")
        address_zip = form_data.get("address_zip", "")
        dx_code = form_data.get("dx_code", "")

        # Generate filename
        current_date = datetime.now().strftime("%m.%d.%y")
        name_for_filename = patient_name.replace(",", "").replace(" ", "_")
        filename = f"Desert_Pulm_Referral_{name_for_filename}_{current_date}.pdf"

        # Generate PDF
        pdf_bytes = self.draw_pdf(
            patient_name,
            phone_number,
            dob,
            case_id,
            address_main,
            address_city,
            address_state,
            address_zip,
            dx_code,
        )
        return filename, pdf_bytes

    def draw_pdf(
        self,
        patient_name: str,
        phone_number: str,
        dob,
        case_id: str,
        address_main: str,
        address_city: str,
        address_state: str,
        address_zip: str,
        dx_code: str,
    ) -> BytesIO:
        # Load the existing PDF template
        base_pdf = PdfReader(self.template_path)
        current_date = datetime.now().strftime("%m/%d/%Y")

        # Create separate overlays for each page
        output = PdfWriter()

        for page_num, base_page in enumerate(base_pdf.pages):

            # Create overlay for this specific page
            overlay_buffer = BytesIO()
            overlay = canvas.Canvas(overlay_buffer, pagesize=letter)
            overlay.setFont("Helvetica", 10)

            if page_num == 0:  # Page 1 - Referral information and orders
                # Current date at the top
                overlay.drawString(100, 599, current_date)  # Date field at top

                # Patient name in "The patient, [NAME] has been REFERRED TO:" section
                overlay.drawString(135, 563, patient_name)

                # DX field (diagnosis code)
                overlay.drawString(92, 126, dx_code)

            elif page_num == 1:  # Page 2 - Patient information section
                # Patient Name
                overlay.drawString(105, 675, patient_name)

                # Phone number
                overlay.drawString(150, 639, phone_number)

                # Date of Birth
                if dob:
                    dob_str = dob.strftime("%m/%d/%Y")
                    overlay.drawString(100, 603, dob_str)

                # Case ID
                overlay.drawString(118, 567, case_id)

                # Address (combine all address fields)
                full_address = (
                    f"{address_main}, {address_city}, {address_state} {address_zip}"
                )
                overlay.drawString(118, 531, full_address)

                # Insurance section - INSURED field gets patient name
                overlay.drawString(127, 409, patient_name)

                # Insured ID# gets the case ID
                overlay.drawString(475, 385, case_id)

                # Signature line - add doctor name and date
                overlay.drawString(450, 220, current_date)

            # elif page_num == 2:  # Page 3 - Add any page 3 specific content here if needed
            #     pass

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
