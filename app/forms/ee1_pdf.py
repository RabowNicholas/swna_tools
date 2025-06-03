def draw_signature_overlay(sig_overlay_path, signature_path):
    c = canvas.Canvas(sig_overlay_path, pagesize=letter)

    if signature_path and os.path.exists(signature_path):
        try:
            img_width = 150
            img_height = 40
            x_position = 38
            y_position = 60
            c.drawImage(
                signature_path,
                x_position,
                y_position,
                width=img_width,
                height=img_height,
            )
        except Exception as img_err:
            print(f"Signature image error: {img_err}")
    c.save()


from pdfrw import PdfReader, PdfWriter, PdfDict, PdfName, PageMerge
import os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter


TEMPLATE_PATH = "app/templates/EE-1 DRAFT.pdf"
OUTPUT_DIR = "data/output"


def draw_overlay(overlay_path, data, signature_path):
    c = canvas.Canvas(overlay_path, pagesize=letter)
    c.setFont("Helvetica", 10)
    c.setFillColorRGB(0, 0, 0)

    # Name fields
    # Name + SSN
    c.drawString(38, 641, data.get("last_name", ""))  # Last Name
    c.drawString(255, 641, data.get("first_name", ""))  # First Name
    c.drawString(360, 641, data.get("middle_initial", ""))  # MI
    c.drawString(400, 641, data.get("ssn", ""))  # SSN

    # DOB
    dob = data.get("dob", "")
    dob_parts = dob.split("/")
    c.drawString(130, 618, dob_parts[0] if len(dob_parts) > 0 else "")  # Month
    c.drawString(160, 618, dob_parts[1] if len(dob_parts) > 1 else "")  # Day
    c.drawString(190, 618, dob_parts[2] if len(dob_parts) > 2 else "")  # Year

    # Sex Checkboxes
    sex = data.get("sex", "").strip().upper()
    if sex == "MALE":
        c.drawString(257, 611, "X")
    elif sex == "FEMALE":
        c.drawString(300, 611, "X")

    # Address + City + Zip
    c.drawString(32, 579, data.get("address", ""))  # Street address
    c.drawString(32, 551, data.get("city", ""))
    c.drawString(270, 551, data.get("state", ""))
    c.drawString(304, 551, data.get("zip", ""))

    # Phone number split into Area, Exchange, Number
    phone = data.get("phone", "")  # Format: ###-###-####
    parts = phone.split("-")
    c.drawString(398, 577, parts[0] if len(parts) > 0 else "")  # Area
    c.drawString(440, 577, parts[1] if len(parts) > 1 else "")  # Exchange
    c.drawString(485, 577, parts[2] if len(parts) > 2 else "")  # Number

    # Diagnosis checkbox and descriptions
    diagnosis_type = data.get("diagnosis", "").upper()

    if diagnosis_type == "CANCER":
        c.drawString(38, 515, "X")  # Cancer checkbox
        c.drawString(70, 494, data.get("diagnosis_description_1", ""))
        date1 = data.get("diagnosis_date_1", "").split("/")
        c.drawString(465, 494, date1[0] if len(date1) > 0 else "")
        c.drawString(507, 494, date1[1] if len(date1) > 1 else "")
        c.drawString(553, 494, date1[2] if len(date1) > 2 else "")
        c.drawString(70, 476, data.get("diagnosis_description_2", ""))
        date2 = data.get("diagnosis_date_2", "").split("/")
        c.drawString(465, 476, date2[0] if len(date2) > 0 else "")
        c.drawString(507, 476, date2[1] if len(date2) > 1 else "")
        c.drawString(553, 476, date2[2] if len(date2) > 2 else "")
        c.drawString(70, 458, data.get("diagnosis_description_3", ""))
        date3 = data.get("diagnosis_date_3", "").split("/")
        c.drawString(465, 458, date3[0] if len(date3) > 0 else "")
        c.drawString(507, 458, date3[1] if len(date3) > 1 else "")
        c.drawString(553, 458, date3[2] if len(date3) > 2 else "")

    elif diagnosis_type == "BERYLIUM SENSITIVITY":
        c.drawString(38, 440, "X")  # Beryllium Sensitivity checkbox
        date = data.get("diagnosis_date_1", "").split("/")
        c.drawString(465, 440, date[0] if len(date) > 0 else "")
        c.drawString(507, 440, date[1] if len(date) > 1 else "")
        c.drawString(553, 440, date[2] if len(date) > 2 else "")

    elif diagnosis_type == "CHRONIC BERYLIUM DISEASE":
        c.drawString(38, 423, "X")  # Chronic Beryllium Disease checkbox
        date = data.get("diagnosis_date_1", "").split("/")
        c.drawString(465, 423, date[0] if len(date) > 0 else "")
        c.drawString(507, 423, date[1] if len(date) > 1 else "")
        c.drawString(553, 423, date[2] if len(date) > 2 else "")

    elif diagnosis_type == "CHRONIC SILICOSIS":
        c.drawString(38, 405, "X")  # Chronic Silicosis checkbox
        date = data.get("diagnosis_date_1", "").split("/")
        c.drawString(465, 405, date[0] if len(date) > 0 else "")
        c.drawString(507, 405, date[1] if len(date) > 1 else "")
        c.drawString(553, 405, date[2] if len(date) > 2 else "")

    elif diagnosis_type == "OTHER":
        c.drawString(38, 388, "X")  # Other checkbox

        descriptions = [
            data.get("diagnosis_description_1", "").strip(),
            data.get("diagnosis_description_2", "").strip(),
            data.get("diagnosis_description_3", "").strip(),
        ]
        dates = [
            data.get("diagnosis_date_1", "").strip(),
            data.get("diagnosis_date_2", "").strip(),
            data.get("diagnosis_date_3", "").strip(),
        ]
        y_positions = [371, 355, 339]

        for i in range(3):
            if descriptions[i] or dates[i]:
                if descriptions[i]:
                    c.drawString(70, y_positions[i], descriptions[i])
                if dates[i]:
                    date_parts = dates[i].split("/")
                    c.drawString(
                        465,
                        y_positions[i],
                        date_parts[0] if len(date_parts) > 0 else "",
                    )
                    c.drawString(
                        507,
                        y_positions[i],
                        date_parts[1] if len(date_parts) > 1 else "",
                    )
                    c.drawString(
                        553,
                        y_positions[i],
                        date_parts[2] if len(date_parts) > 2 else "",
                    )

    # Awards Section - mark "No" for all
    c.drawString(556, 310, "X")
    c.drawString(556, 295, "X")
    c.drawString(556, 277, "X")
    c.drawString(556, 255, "X")
    c.drawString(556, 237, "X")
    c.drawString(556, 195, "X")

    # Signature Date
    today_date = data.get("today_date", "")
    c.drawString(285, 75, today_date)  # Approximate location next to signature

    if signature_path and os.path.exists(signature_path):
        try:
            # Resize and position the image
            img_width = 135  # adjust based on actual space
            img_height = 30  # adjust based on actual space
            x_position = 38  # fine-tune this
            y_position = 60  # fine-tune this

            c.drawImage(
                signature_path,
                x_position,
                y_position,
                width=img_width,
                height=img_height,
                mask="auto",
            )
        except Exception as img_err:
            print(f"Signature image error: {img_err}")

    c.save()


def fill_ee1_pdf(data, signature_path, output_path):
    try:
        reader = PdfReader(TEMPLATE_PATH)
        for page in reader.pages:
            annotations = page.Annots
            if not annotations:
                continue

            for annotation in annotations:
                if annotation.Subtype == PdfName.Widget and annotation.T:
                    if annotation.T == "(1  Name Last)":
                        annotation.update(PdfDict(V="Test Last", AP=""))

        # annotations = reader.pages[0]["/Annots"]

        # for annotation in annotations:
        #     if annotation["/Subtype"] == PdfName.Widget:
        #         key = annotation.get("/T")
        #         if key:
        #             key_name = key[1:-1]  # strip parentheses
        #             form_field = FIELD_MAP.get(key_name)
        #             if form_field and form_field in data:
        #                 annotation.update(PdfDict(V="{}".format(data[form_field])))

        if not os.path.exists(OUTPUT_DIR):
            os.makedirs(OUTPUT_DIR)

        sig_overlay_path = os.path.join(OUTPUT_DIR, "sig_overlay.pdf")
        draw_signature_overlay(sig_overlay_path, signature_path)
        sig_overlay_pdf = PdfReader(sig_overlay_path)

        overlay_path = os.path.join(OUTPUT_DIR, "overlay.pdf")
        draw_overlay(overlay_path, data, None)
        overlay_pdf = PdfReader(overlay_path)

        for page, sig_page, overlay_page in zip(
            reader.pages, sig_overlay_pdf.pages, overlay_pdf.pages
        ):
            PageMerge(page).add(sig_page, prepend=True).add(overlay_page).render()

        # Remove annotations from each page
        for page in reader.pages:
            if "/Annots" in page:
                del page["/Annots"]

        # Remove the AcroForm dictionary entirely
        if hasattr(reader, "Root") and "/AcroForm" in reader.Root:
            del reader.Root["/AcroForm"]

        PdfWriter().write(output_path, reader)
        return output_path

    except Exception as e:
        print(f"Error: {e}")
        return None
