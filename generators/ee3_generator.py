from datetime import datetime
from io import BytesIO
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter


class EE3Generator:
    def __init__(self, template_path="templates/EE-3.pdf"):
        self.template_path = template_path

    def format_date(self, date_value, format_str="%m/%d/%Y"):
        """Helper function to format dates that could be strings or datetime objects"""
        if not date_value:
            return ""

        if isinstance(date_value, str):
            try:
                date_obj = datetime.strptime(date_value, "%Y-%m-%d")
                return date_obj.strftime(format_str)
            except ValueError:
                try:
                    date_obj = datetime.strptime(date_value, "%m/%d/%Y")
                    return date_obj.strftime(format_str)
                except ValueError:
                    return str(date_value)
        else:
            return date_value.strftime(format_str)

    def wrap_text(self, text, max_chars_per_line=140, max_lines=4):
        """Wrap text into multiple lines with character limit"""
        if not text:
            return [""]

        words = text.split(" ")
        lines = []
        current_line = ""

        for word in words:
            if len(current_line + word) <= max_chars_per_line:
                current_line += word + " "
            else:
                if current_line:
                    lines.append(current_line.strip())
                current_line = word + " "

                if len(lines) >= max_lines:
                    print(f"[EE3] Warning: Text exceeds {max_lines} lines. Text truncated.")
                    return lines

        if current_line:
            lines.append(current_line.strip())

        if len(lines) > max_lines:
            return lines[:max_lines]

        return lines

    def generate(self, client_record: dict, form_data: dict) -> tuple[str, BytesIO]:
        first_name = form_data.get("first_name", "")
        last_name = form_data.get("last_name", "")
        former_name = form_data.get("former_name", "")
        ssn = form_data.get("ssn", "")
        employment_history = form_data.get("employment_history", [])

        # Limit to 3 employers
        if len(employment_history) > 3:
            print("[EE3] Warning: EE-3 form supports maximum 3 employers. Only first 3 will be included.")
            employment_history = employment_history[:3]

        # Generate filename
        current_date = datetime.now().strftime("%m.%d.%y")
        if first_name and last_name:
            filename = f"EE3_{first_name[0]}.{last_name}_{current_date}.pdf"
        else:
            filename = f"EE3_Unknown_{current_date}.pdf"

        # Generate PDF
        pdf_bytes = self.draw_pdf(
            first_name,
            last_name,
            former_name,
            ssn,
            employment_history,
        )
        return filename, pdf_bytes

    def draw_employer_section(self, overlay, job, base_y, deltas, page_num):
        """Draw a single employer section on the overlay"""
        # Parse dates
        start_date = job.get("start_date")
        end_date = job.get("end_date")

        start_date_str = self.format_date(start_date) if start_date else ""
        end_date_str = self.format_date(end_date) if end_date else ""

        # Dates section
        dates_y = base_y + deltas["dates"]
        if start_date_str:
            parts = start_date_str.split("/")
            if len(parts) == 3:
                overlay.drawString(175, dates_y, parts[0])  # month
                overlay.drawString(205, dates_y, parts[1])  # day
                overlay.drawString(230, dates_y, parts[2])  # year

        if end_date_str:
            parts = end_date_str.split("/")
            if len(parts) == 3:
                overlay.drawString(360, dates_y, parts[0])  # month
                overlay.drawString(390, dates_y, parts[1])  # day
                overlay.drawString(415, dates_y, parts[2])  # year

        # Facility information
        facility_y = base_y + deltas["facility"]
        overlay.drawString(30, facility_y, job.get("facility_name", ""))
        overlay.drawString(265, facility_y, job.get("specific_location", ""))

        # City/State
        city = job.get("city", "")
        state = job.get("state", "")
        city_state = f"{city}, {state}" if city and state else city or state
        overlay.drawString(435, facility_y, city_state)

        # Contractor
        contractor_y = base_y + deltas["contractor"]
        overlay.drawString(30, contractor_y, job.get("contractor", ""))

        # Position Title
        position_y = base_y + deltas["position"]
        overlay.drawString(30, position_y, job.get("position_title", ""))

        # Union Member checkbox
        if job.get("union_member") and "union_checkbox" in deltas:
            union_y = base_y + deltas["union_checkbox"]
            overlay.drawString(204, union_y, "X")

        # Dosimetry Badge Worn checkbox
        if job.get("dosimetry_worn") and "dosimetry_checkbox" in deltas:
            dosimetry_y = base_y + deltas["dosimetry_checkbox"]
            overlay.drawString(442, dosimetry_y, "X")

        # Facility Type Checkbox - DOE Facility (always mark)
        if "facility_checkbox" in deltas:
            facility_checkbox_y = base_y + deltas["facility_checkbox"]
            overlay.drawString(238, facility_checkbox_y, "X")

        # Work Duties
        duties_y = base_y + deltas["duties"]
        duties_text = job.get("work_duties", "")
        duties_lines = self.wrap_text(duties_text)

        if duties_lines and duties_lines[0]:
            y_position = duties_y
            for line in duties_lines:
                overlay.drawString(20, y_position, line)
                y_position -= 12

        # Exposures (only for page 2)
        if "exposures" in deltas:
            exposures_y = base_y + deltas["exposures"]
            exposures_text = "Claimant stated they were exposed to radiation, silica dust, and other chemicals, solvents and contaminants during the course of their employment."
            exposures_lines = self.wrap_text(exposures_text)

            if exposures_lines and exposures_lines[0]:
                y_position = exposures_y
                for line in exposures_lines:
                    overlay.drawString(20, y_position, line)
                    y_position -= 12

    def draw_pdf(
        self,
        first_name: str,
        last_name: str,
        former_name: str,
        ssn: str,
        employment_history: list,
    ) -> BytesIO:
        # Load the existing PDF
        base_pdf = PdfReader(self.template_path)
        output = PdfWriter()

        current_date = datetime.now().strftime("%m/%d/%Y")

        # Define page-specific coordinate deltas
        page1_deltas = {
            "dates": 0,
            "facility": -42,
            "contractor": -87,
            "position": -119,
            "facility_checkbox": -70,
            "union_checkbox": -420,
            "dosimetry_checkbox": -114,
            "duties": -180,
            "exposures": -286,
        }

        page2_employer2_deltas = {
            "dates": 0,
            "facility": -38,
            "contractor": -79,
            "position": -108,
            "duties": -160,
            "exposures": -212,
            "facility_checkbox": -65,
            "union_checkbox": -282,
            "dosimetry_checkbox": -107,
        }

        page2_employer3_deltas = {
            "dates": 0,
            "facility": -37,
            "contractor": -80,
            "position": -110,
            "duties": -163,
            "exposures": -213,
            "facility_checkbox": -66,
            "union_checkbox": -286,
            "dosimetry_checkbox": -109,
        }

        # Employer positions
        employer_positions = [
            {"page": 0, "base_y": 468, "deltas": page1_deltas},
            {"page": 1, "base_y": 761, "deltas": page2_employer2_deltas},
            {"page": 1, "base_y": 460, "deltas": page2_employer3_deltas},
        ]

        # --- Page 1 ---
        page1_overlay_buffer = BytesIO()
        page1_overlay = canvas.Canvas(page1_overlay_buffer, pagesize=letter)
        page1_overlay.setFont("Helvetica", 9)

        # Header info - Employee Name (Field 1)
        page1_overlay.drawString(30, 640, last_name)
        page1_overlay.drawString(150, 640, first_name)
        if former_name:
            page1_overlay.drawString(250, 640, former_name)
        page1_overlay.drawString(440, 640, ssn)

        # Draw employer 1 if exists
        if len(employment_history) > 0:
            pos = employer_positions[0]
            self.draw_employer_section(
                page1_overlay,
                employment_history[0],
                pos["base_y"],
                pos["deltas"],
                0
            )

        page1_overlay.save()
        page1_overlay_buffer.seek(0)

        # Merge page 1
        page1_overlay_pdf = PdfReader(page1_overlay_buffer)
        base_page1 = base_pdf.pages[0]
        base_page1.merge_page(page1_overlay_pdf.pages[0])
        output.add_page(base_page1)

        # --- Page 2 ---
        if len(base_pdf.pages) > 1:
            page2_overlay_buffer = BytesIO()
            page2_overlay = canvas.Canvas(page2_overlay_buffer, pagesize=letter)
            page2_overlay.setFont("Helvetica", 9)

            # Date on page 2
            page2_overlay.drawString(385, 60, current_date)

            # Draw employers 2 and 3 if they exist
            for i in range(1, min(len(employment_history), 3)):
                pos = employer_positions[i]
                self.draw_employer_section(
                    page2_overlay,
                    employment_history[i],
                    pos["base_y"],
                    pos["deltas"],
                    1
                )

            page2_overlay.save()
            page2_overlay_buffer.seek(0)

            page2_overlay_pdf = PdfReader(page2_overlay_buffer)
            base_page2 = base_pdf.pages[1]
            base_page2.merge_page(page2_overlay_pdf.pages[0])
            output.add_page(base_page2)

        # --- Page 3 ---
        if len(base_pdf.pages) > 2:
            page3_overlay_buffer = BytesIO()
            page3_overlay = canvas.Canvas(page3_overlay_buffer, pagesize=letter)
            page3_overlay.setFont("Helvetica", 9)
            page3_overlay.drawString(500, 50, current_date)
            page3_overlay.save()
            page3_overlay_buffer.seek(0)

            page3_overlay_pdf = PdfReader(page3_overlay_buffer)
            base_page3 = base_pdf.pages[2]
            base_page3.merge_page(page3_overlay_pdf.pages[0])
            output.add_page(base_page3)

        result = BytesIO()
        output.write(result)
        result.seek(0)
        return result
