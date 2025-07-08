import streamlit as st
from datetime import datetime, timedelta
from generators.invoice_generator import generate_invoice_file
from services.airtable import fetch_clients, fetch_invoice_by_id


def render_invoice():
    st.header("Generate Invoice")

    if "client_records" not in st.session_state:
        with st.spinner("Loading clients..."):
            try:
                st.session_state.client_records = fetch_clients()
            except Exception as e:
                st.error(f"Failed to load clients: {e}")
                return

    # Client selection
    client_names = [
        rec["fields"].get("Name", f"Unnamed {i}")
        for i, rec in enumerate(st.session_state.client_records)
    ]
    client_name = st.selectbox("Select a Client", ["Select..."] + client_names)

    if client_name == "Select...":
        st.warning("Please select a client.")
        return

    client_record = next(
        (
            rec
            for rec in st.session_state.client_records
            if rec["fields"].get("Name") == client_name
        ),
        None,
    )

    fields = client_record["fields"]
    parsed_name = fields.get("Name", "")
    try:
        last, rest = parsed_name.split(",", 1)
        first = rest.split("-")[0].strip()
        display_name = f"{first} {last.strip()}"
    except ValueError:
        display_name = parsed_name

    # Prefill values
    invoice_number = st.text_input("Invoice Number", value="1")
    invoice_date = st.date_input(
        "Invoice Date", value=datetime.today() + timedelta(days=30)
    )
    case_id = st.text_input("Case ID", value=fields.get("Case ID", ""))

    address_prefill = fields.get("Address", "")
    if "," in address_prefill:
        prefill_main, prefill_city_zip = address_prefill.rsplit(",", 1)
        prefill_main = prefill_main.strip()
        prefill_city_zip = prefill_city_zip.strip()
    else:
        prefill_main = address_prefill
        prefill_city_zip = ""

    address_main_input = st.text_input("Street Address", value=prefill_main)

    import re

    city, state, zip_code = "", "", ""
    city_state_zip_match = re.match(r"(.*),?\s*([A-Z]{2})\s*(\d{5})", prefill_city_zip)
    if city_state_zip_match:
        city, state, zip_code = city_state_zip_match.groups()

    address_city_input = st.text_input("City", value=city.strip())
    address_state_input = st.text_input("State", value=state.strip())
    address_zip_input = st.text_input("ZIP Code", value=zip_code.strip())

    fd_letter_date = st.date_input("Date on FD Letter", value=datetime.today())

    part_type = st.radio("Award Type", ["Part B", "Part E"])
    ar_fee = None
    awarded_amount = None

    if part_type == "Part B":
        ar_fee = st.number_input(
            "AR Fee (%)", min_value=0.0, max_value=100.0, value=2.0
        )
    else:
        awarded_amount = st.text_input("Amount Awarded (e.g. 2000)")

    st.subheader("Invoice Items")

    if "invoice_items" not in st.session_state:
        st.session_state.invoice_items = []

        for invoice_id in fields.get("Invoicing", []):
            inv = fetch_invoice_by_id(invoice_id)
            raw = inv.get("fields", {}).get("Name", "").lower()
            if "pending" in raw or "payment complete" in raw:
                continue

            # Determine item type
            if "toupin" in raw and "memo" in raw:
                name = "Physician Response Memo - Dr. Toupin"
            elif "toupin" in raw:
                name = "Physician File Review - Dr. Toupin"
            elif "herold" in raw and "memo" in raw:
                name = "Physician Response Memo - Dr. Herold"
            elif "herold" in raw:
                name = "Physician File Review - Dr. Herold"
            elif "klepper" in raw and "2nd" in raw:
                name = "B-read 2nd Opinion - Dr. Smith"
            elif "klepper" in raw or "b-read" in raw:
                name = "B-read Imaging - Dr. Klepper"
            elif "smith" in raw and "2nd" in raw:
                name = "B-read 2nd Opinion - Dr. Smith"
            elif "smith" in raw or "b-read" in raw:
                name = "B-read Imaging - Dr. Smith"
            elif "discount" in raw or "-$" in raw or "$-" in raw:
                name = "Discount"
            else:
                name = ""

            import re

            date_match = re.search(r"(\d{1,2})[./](\d{1,2})[./](\d{2,4})", raw)
            if date_match:
                m, d, y = date_match.groups()
                if len(y) == 2:
                    y = "20" + y
                date = f"{int(m):02d}/{int(d):02d}/{y}"
            else:
                date = ""

            st.session_state.invoice_items.append({"name": name, "date": date})

    for i, item in enumerate(st.session_state.invoice_items):
        cols = st.columns([3, 2, 1])
        item["name"] = cols[0].selectbox(
            "Item",
            [
                "Physician File Review - Dr. Toupin",
                "Physician File Review - Dr. Herold",
                "B-read Imaging - Dr. Klepper",
                "B-read Imaging - Dr. Smith",
                "B-read 2nd Opinion - Dr. Smith",
                "Physician Response Memo - Dr. Toupin",
                "Physician Response Memo - Dr. Herold",
                "Discount",
            ],
            key=f"name_{i}",
            index=(
                0
                if not item["name"]
                else [
                    "Physician File Review - Dr. Toupin",
                    "Physician File Review - Dr. Herold",
                    "B-read Imaging - Dr. Klepper",
                    "B-read Imaging - Dr. Smith",
                    "B-read 2nd Opinion - Dr. Smith",
                    "Physician Response Memo - Dr. Toupin",
                    "Physician Response Memo - Dr. Herold",
                    "Discount",
                ].index(item["name"])
            ),
        )
        item["date"] = cols[1].text_input(
            "Date (MM/DD/YYYY)", value=item["date"], key=f"date_{i}"
        )
        if cols[2].button("Remove", key=f"remove_{i}"):
            st.session_state.invoice_items.pop(i)
            st.rerun()

    if st.button("Add Item"):
        st.session_state.invoice_items.append({"name": "", "date": ""})

    if st.button("Generate Invoice"):
        if not all(
            [
                invoice_number,
                case_id,
                address_main_input,
                address_city_input,
                address_state_input,
                address_zip_input,
                fd_letter_date,
            ]
        ):
            st.error("All fields are required.")
            return

        invoice_data = {
            "invoice_date": invoice_date.strftime("%m/%d/%Y"),
            "case_id": case_id,
            "invoice_number": invoice_number,
            "client_name": display_name,
            "address_main": address_main_input,
            "address_city": address_city_input,
            "address_state": address_state_input,
            "address_zip": address_zip_input,
            "fd_letter_date": fd_letter_date.strftime("%m/%d/%Y"),
            "part_type": part_type,
            "ar_fee": str(ar_fee) if ar_fee is not None else None,
            "awarded_amount": awarded_amount,
            "invoice_items": st.session_state.invoice_items,
        }

        try:
            filename, file_bytes = generate_invoice_file(invoice_data)
            st.download_button(
                "Download Invoice", data=file_bytes.read(), file_name=filename
            )
        except Exception as e:
            st.error(f"Error generating invoice: {e}")
