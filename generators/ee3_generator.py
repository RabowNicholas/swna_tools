from datetime import datetime
from io import BytesIO
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter


class EE3Generator:
    def __init__(self, template_path="templates/EE-3.pdf"):
        self.template_path = template_path

    def generate(self, client_record: dict, form_data: dict) -> tuple[str, BytesIO]:
        first_name = form_data.get("first_name", "")
        last_name = form_data.get("last_name", "")
        name = f"{last_name}, {first_name}" if last_name and first_name else ""
        former_name = form_data.get("former_name", "")
        ssn = form_data.get("ssn", "")
        employment_history = form_data.get("employment_history", [])

        # Generate filename
        current_date = datetime.now().strftime("%m.%d.%y")
        if first_name and last_name:
            filename = f"EE3_{first_name[0]}.{last_name}_{current_date}.pdf"
        else:
            filename = f"EE3_Unknown_{current_date}.pdf"

        # Generate PDF
        pdf_bytes = self.draw_pdf(
            name,
            former_name,
            ssn,
            employment_history,
        )
        return filename, pdf_bytes

    def draw_pdf(
        self,
        name: str,
        former_name: str,
        ssn: str,
        employment_history: list,
    ) -> BytesIO:
        # Load the existing PDF
        base_pdf = PdfReader(self.template_path)
        base_page = base_pdf.pages[0]

        # Create overlay
        overlay_buffer = BytesIO()
        overlay = canvas.Canvas(overlay_buffer, pagesize=letter)
        overlay.setFont("Helvetica", 9)  # Smaller font for employment history

        # NOTE: These coordinates are placeholders and will need to be adjusted
        # based on the actual EE-3 PDF template layout
        
        # Basic Information
        overlay.drawString(100, 700, name)
        if former_name:
            overlay.drawString(100, 680, former_name)
        overlay.drawString(400, 700, ssn)
        
        # Employment History Section
        # We'll start positioning employment entries below the basic info
        employment_start_y = 600
        line_height = 15
        entry_height = 120  # Height needed for each complete employment entry
        
        for i, job in enumerate(employment_history):
            # Calculate position for this employment entry
            y_base = employment_start_y - (i * entry_height)
            
            # Check if we're getting too low on the page
            if y_base < 100:
                # For now, we'll just stop adding entries
                # In a more sophisticated implementation, we'd create multiple pages
                overlay.drawString(100, y_base + 50, f"[Additional {len(employment_history) - i} employment entries truncated]")
                break
            
            # Employment entry header
            overlay.setFont("Helvetica-Bold", 10)
            overlay.drawString(100, y_base, f"Employment #{i+1}")
            overlay.setFont("Helvetica", 9)
            
            # Dates
            start_date_str = job["start_date"].strftime("%m/%d/%Y") if job["start_date"] else ""
            end_date_str = job["end_date"].strftime("%m/%d/%Y") if job["end_date"] else "Present"
            overlay.drawString(100, y_base - 20, f"Start: {start_date_str}")
            overlay.drawString(250, y_base - 20, f"End: {end_date_str}")
            
            # Facility and location
            overlay.drawString(100, y_base - 35, f"Facility: {job['facility_name']}")
            overlay.drawString(100, y_base - 50, f"Location: {job['specific_location']}")
            overlay.drawString(300, y_base - 50, f"{job['city']}, {job['state']}")
            
            # Contractor and position
            overlay.drawString(100, y_base - 65, f"Contractor: {job['contractor']}")
            overlay.drawString(100, y_base - 80, f"Position: {job['position_title']}")
            
            # Union status
            union_status = "Yes" if job['union_member'] else "No"
            overlay.drawString(400, y_base - 80, f"Union: {union_status}")
            
            # Work duties (truncate if too long)
            duties = job['work_duties']
            if len(duties) > 80:  # Truncate long descriptions
                duties = duties[:77] + "..."
            overlay.drawString(100, y_base - 95, f"Duties: {duties}")
            
            # Separator line
            overlay.line(100, y_base - 110, 500, y_base - 110)
        
        # If there are many employment entries, add a note about continuation
        if len(employment_history) > 4:  # Assuming we can fit about 4 entries per page
            overlay.setFont("Helvetica-Oblique", 8)
            overlay.drawString(100, 50, "Note: Additional employment history may require separate documentation.")
        
        overlay.save()
        overlay_buffer.seek(0)

        # Merge template onto overlay (consistent layering approach)
        overlay_pdf = PdfReader(overlay_buffer)
        overlay_page = overlay_pdf.pages[0]

        output = PdfWriter()
        overlay_page.merge_page(base_page)
        output.add_page(overlay_page)

        result = BytesIO()
        output.write(result)
        result.seek(0)
        return result