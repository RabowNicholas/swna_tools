from datetime import datetime
from io import BytesIO
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter


class EE3Generator:
    def __init__(self, template_path="templates/EE-3.pdf"):
        self.template_path = template_path

    def generate(self, client_record: dict, form_data: dict) -> tuple[str, BytesIO]:
        # Extract all form data
        first_name = form_data.get("first_name", "")
        last_name = form_data.get("last_name", "")
        name = f"{last_name}, {first_name}" if last_name and first_name else ""
        former_name = form_data.get("former_name", "")
        ssn = form_data.get("ssn", "")
        employment_history = form_data.get("employment_history", [])

        # Employee contact information
        employee_contact = {
            "address": form_data.get("employee_address", ""),
            "city": form_data.get("employee_city", ""),
            "state": form_data.get("employee_state", ""),
            "zip": form_data.get("employee_zip", ""),
            "phone_home": form_data.get("phone_home", ""),
            "phone_work": form_data.get("phone_work", ""),
            "phone_cell": form_data.get("phone_cell", ""),
        }

        # Contact person information (person completing form)
        contact_person = {
            "first_name": form_data.get("contact_first_name", ""),
            "last_name": form_data.get("contact_last_name", ""),
            "address": form_data.get("contact_address", ""),
            "city": form_data.get("contact_city", ""),
            "state": form_data.get("contact_state", ""),
            "zip": form_data.get("contact_zip", ""),
        }

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
            employee_contact,
            contact_person,
            employment_history,
        )
        return filename, pdf_bytes

    def _wrap_text(
        self, text: str, max_chars_per_line: int = 140, max_lines: int = 4
    ) -> list:
        """
        Wrap text into multiple lines with character limit.
        Returns list of lines or empty list if text exceeds max_lines.
        """
        if not text:
            return [""]

        words = text.split()
        lines = []
        current_line = ""

        for word in words:
            # Check if adding this word would exceed the character limit
            if len(current_line + word) <= max_chars_per_line:
                current_line += word + " "
            else:
                # Finish current line and start new one
                if current_line:
                    lines.append(current_line.strip())
                current_line = word + " "

                # Check if we've exceeded max lines
                if len(lines) >= max_lines:
                    print(
                        f"Warning: Work duties text exceeds {max_lines} lines. Text not added to PDF - please add manually after generation."
                    )
                    return []

        # Add the last line
        if current_line:
            lines.append(current_line.strip())

        # Final check for line count
        if len(lines) > max_lines:
            print(
                f"Warning: Work duties text exceeds {max_lines} lines. Text not added to PDF - please add manually after generation."
            )
            return []

        return lines

    def _draw_employer_section(
        self,
        overlay,
        marks_overlay,
        job: dict,
        base_y: int,
        deltas: dict,
        total_employers: int = 1,
        page_num: int = 0,
    ):
        """
        Draw a single employer section at the specified base Y coordinate.
        Uses provided deltas for flexible field spacing.
        """
        # Dates - From Date and To Date fields
        start_date_str = (
            job["start_date"].strftime("%m/%d/%Y") if job["start_date"] else ""
        )
        end_date_str = job["end_date"].strftime("%m/%d/%Y") if job["end_date"] else ""

        # From Date fields (Month, Day, Year) - base_y + deltas["dates"] (dates section)
        dates_y = base_y + deltas["dates"]
        if start_date_str:
            month, day, year = start_date_str.split("/")
            overlay.drawString(200, dates_y, month)  # From Month
            overlay.drawString(250, dates_y, day)  # From Day
            overlay.drawString(300, dates_y, year)  # From Year

        # To Date fields (Month, Day, Year)
        if end_date_str:
            month, day, year = end_date_str.split("/")
            overlay.drawString(435, dates_y, month)  # To Month
            overlay.drawString(485, dates_y, day)  # To Day
            overlay.drawString(535, dates_y, year)  # To Year

        # Facility information - base_y + deltas["facility"] (facility section)
        facility_y = base_y + deltas["facility"]
        overlay.drawString(30, facility_y, job["facility_name"])
        overlay.drawString(265, facility_y, job["specific_location"])

        # City/State where work performed
        city_state = f"{job['city']}, {job['state']}"
        overlay.drawString(435, facility_y, city_state)

        # Contractor/sub-contractor - base_y + deltas["contractor"] (contractor section)
        contractor_y = base_y + deltas["contractor"]
        overlay.drawString(30, contractor_y, job["contractor"])

        # Position Title - base_y + deltas["position"] (position section)
        position_y = base_y + deltas["position"]
        overlay.drawString(30, position_y, job["position_title"])

        # Facility Type Checkboxes - only if multiple employers provided and not on page 0
        if total_employers > 1 and page_num > 0:
            facility_checkbox_y = base_y + deltas["facility_checkbox"]

            # Department of Energy Facility checkbox - always mark for all employers
            marks_overlay.drawString(280, facility_checkbox_y, "X")

            # Dosimeter Badge Worn checkbox
            dosimetry_worn = job.get("dosimetry_worn", False)
            dosimetry_checkbox_y = base_y + deltas["dosimetry_checkbox"]
            if dosimetry_worn:
                marks_overlay.drawString(438, dosimetry_checkbox_y, "X")

        # Description of Work Duties - base_y + deltas["duties"] (work duties section)
        duties_y = base_y + deltas["duties"]
        duties = job["work_duties"]
        duties_lines = self._wrap_text(duties)

        # Only add work duties if they fit within the line limit
        if duties_lines:
            y_position = duties_y
            for line in duties_lines:
                overlay.drawString(20, y_position, line)
                y_position -= 12  # Move down 12 points for next line

        # Work conditions/exposures - only for page 2 and only if multiple employers
        if "exposures" in deltas:
            exposures_y = base_y + deltas["exposures"]
            # Use standard exposure text for page 2
            exposures_text = "Claimant stated they were exposed to radiation, silica dust, and other chemicals, solvents and contaminants during the course of their employment."
            exposures_lines = self._wrap_text(exposures_text)

            # Only add exposures text if it fits within the line limit
            if exposures_lines:
                y_position = exposures_y
                for line in exposures_lines:
                    overlay.drawString(20, y_position, line)
                    y_position -= 12  # Move down 12 points for next line

    def draw_pdf(
        self,
        name: str,
        former_name: str,
        ssn: str,
        employee_contact: dict,
        contact_person: dict,
        employment_history: list,
    ) -> BytesIO:
        from datetime import datetime

        # Load the existing PDF template
        base_pdf = PdfReader(self.template_path)

        # Define field spacing deltas for different pages
        page1_deltas = {
            "dates": 0,
            "facility": -50,
            "contractor": -95,
            "position": -125,
            "duties": -180,
            "exposures": -280,
        }

        page2_employer2_deltas = {
            "dates": 0,
            "facility": -45,
            "contractor": -84,
            "position": -110,
            "duties": -155,
            "exposures": -210,
            "facility_checkbox": -74,
            "dosimetry_checkbox": -107,
        }

        page2_employer3_deltas = {
            "dates": 0,
            "facility": -45,
            "contractor": -84,
            "position": -110,
            "duties": -155,
            "exposures": -210,
            "facility_checkbox": -72,
            "dosimetry_checkbox": -103,
        }

        # Define employer positions with page-specific configurations
        employer_positions = [
            {"page": 0, "base_y": 450, "deltas": page1_deltas},  # Employer 1 - Page 1
            {
                "page": 1,
                "base_y": 735,
                "deltas": page2_employer2_deltas,
            },  # Employer 2 - Page 2 top
            {
                "page": 1,
                "base_y": 430,
                "deltas": page2_employer3_deltas,
            },  # Employer 3 - Page 2 bottom
        ]

        # Check if we have more employers than supported
        if len(employment_history) > 3:
            print(
                f"Warning: EE-3 form supports maximum 3 employers. Only first 3 will be included. Additional employers need to be added manually."
            )
            employment_history = employment_history[:3]

        # Create overlays for each page that needs content
        max_page_needed = 0
        for i, job in enumerate(employment_history):
            if i < len(employer_positions):
                max_page_needed = max(max_page_needed, employer_positions[i]["page"])

        # Create overlay for page 1 (always needed for basic info)
        page1_overlay_buffer = BytesIO()
        page1_overlay = canvas.Canvas(page1_overlay_buffer, pagesize=letter)
        page1_overlay.setFont("Helvetica", 9)

        # Create marks overlay for page 1 checkboxes
        page1_marks_buffer = BytesIO()
        page1_marks_overlay = canvas.Canvas(page1_marks_buffer, pagesize=letter)
        page1_marks_overlay.setFont("Helvetica", 10)

        # Employee Basic Information (Page 1)
        page1_overlay.drawString(30, 640, name)  # Employee's Name field
        if former_name:
            page1_overlay.drawString(250, 640, former_name)  # Former Name field
        page1_overlay.drawString(440, 640, ssn)  # SSN field

        # Create overlay for page 2 (always needed for signature)
        page2_overlay_buffer = BytesIO()
        page2_overlay = canvas.Canvas(page2_overlay_buffer, pagesize=letter)
        page2_overlay.setFont("Helvetica", 9)

        # Create marks overlay for page 2 checkboxes
        page2_marks_buffer = BytesIO()
        page2_marks_overlay = canvas.Canvas(page2_marks_buffer, pagesize=letter)
        page2_marks_overlay.setFont("Helvetica", 10)

        # Add date to page 2
        current_date = datetime.now().strftime("%m/%d/%Y")
        page2_overlay.drawString(340, 58, current_date)

        # Draw each employer in their designated position
        for i, job in enumerate(employment_history):
            if i < len(employer_positions):
                position = employer_positions[i]
                if position["page"] == 0:
                    self._draw_employer_section(
                        page1_overlay,
                        page1_marks_overlay,
                        job,
                        position["base_y"],
                        position["deltas"],
                        len(employment_history),
                        position["page"],
                    )
                elif position["page"] == 1:
                    self._draw_employer_section(
                        page2_overlay,
                        page2_marks_overlay,
                        job,
                        position["base_y"],
                        position["deltas"],
                        len(employment_history),
                        position["page"],
                    )

        # Finalize overlays
        page1_overlay.save()
        page1_overlay_buffer.seek(0)
        page1_marks_overlay.save()
        page1_marks_buffer.seek(0)

        # Page 2 overlay always exists now
        page2_overlay.save()
        page2_overlay_buffer.seek(0)
        page2_marks_overlay.save()
        page2_marks_buffer.seek(0)

        # Merge overlays with template pages
        output = PdfWriter()

        # Page 1 - merge overlay + marks with template (marks on top)
        overlay1_pdf = PdfReader(page1_overlay_buffer)
        overlay1_page = overlay1_pdf.pages[0]
        marks1_pdf = PdfReader(page1_marks_buffer)
        marks1_page = marks1_pdf.pages[0]
        base_page1 = base_pdf.pages[0]
        overlay1_page.merge_page(base_page1)
        overlay1_page.merge_page(marks1_page)
        output.add_page(overlay1_page)

        # Page 2 - merge overlay + marks with template (always exists now)
        if len(base_pdf.pages) > 1:
            overlay2_pdf = PdfReader(page2_overlay_buffer)
            overlay2_page = overlay2_pdf.pages[0]
            marks2_pdf = PdfReader(page2_marks_buffer)
            marks2_page = marks2_pdf.pages[0]
            base_page2 = base_pdf.pages[1]
            overlay2_page.merge_page(base_page2)
            overlay2_page.merge_page(marks2_page)
            output.add_page(overlay2_page)
        else:
            # If template only has 1 page, still add our page 2 with signature
            overlay2_pdf = PdfReader(page2_overlay_buffer)
            overlay2_page = overlay2_pdf.pages[0]
            marks2_pdf = PdfReader(page2_marks_buffer)
            marks2_page = marks2_pdf.pages[0]
            overlay2_page.merge_page(marks2_page)
            output.add_page(overlay2_page)

        # Add page 3 if it exists in template (declaration page)
        if len(base_pdf.pages) > 2:
            # Create overlay for page 3 (signature/date page)
            page3_overlay_buffer = BytesIO()
            page3_overlay = canvas.Canvas(page3_overlay_buffer, pagesize=letter)
            page3_overlay.setFont("Helvetica", 9)

            # Add current date to bottom of page 3
            current_date = datetime.now().strftime("%m/%d/%Y")
            page3_overlay.drawString(500, 50, current_date)  # Bottom right area

            page3_overlay.save()
            page3_overlay_buffer.seek(0)

            # Merge page 3 overlay with template
            page3_overlay_pdf = PdfReader(page3_overlay_buffer)
            page3_overlay_page = page3_overlay_pdf.pages[0]
            base_page3 = base_pdf.pages[2]
            page3_overlay_page.merge_page(base_page3)
            output.add_page(page3_overlay_page)

        result = BytesIO()
        output.write(result)
        result.seek(0)
        return result
