import streamlit as st
from services.airtable import fetch_clients
from generators.ee10_generator import EE10Generator
import re


def render_ee10():
    st.header("Generate EE-10 Form")

    if "client_records" not in st.session_state:
        with st.spinner("Loading clients..."):
            try:
                st.session_state.client_records = fetch_clients()
            except Exception as e:
                st.error(f"Failed to load clients: {e}")
                return

    client_names = [
        rec["fields"].get("Name", f"Unnamed {i}")
        for i, rec in enumerate(st.session_state.client_records)
    ]
    client_selection = st.selectbox("Select a Client", ["Select..."] + client_names)

    # Prefill fields when client changes
    if client_selection != "Select...":
        record = next(
            (
                rec
                for rec in st.session_state.client_records
                if rec["fields"].get("Name") == client_selection
            ),
            None,
        )
        if record:
            fields = record["fields"]
            raw_name = fields.get("Name", "")
            try:
                last, rest = raw_name.split(",", 1)
                first = rest.split("-")[0].strip()
                full_name = f"{first} {last.strip()}"
            except ValueError:
                full_name = raw_name
            st.session_state["prefill_name"] = full_name
            st.session_state["prefill_case_id"] = fields.get("Case ID", "")
            st.session_state["prefill_address"] = fields.get("Address", "")
            st.session_state["prefill_phone"] = fields.get("Phone", "")
        else:
            st.session_state["prefill_name"] = ""
            st.session_state["prefill_case_id"] = ""
            st.session_state["prefill_address"] = ""
            st.session_state["prefill_phone"] = ""
    else:
        st.session_state["prefill_name"] = ""
        st.session_state["prefill_case_id"] = ""
        st.session_state["prefill_address"] = ""
        st.session_state["prefill_phone"] = ""

    doctor_selection = st.selectbox("Select a Doctor", ["La Plata", "Dr. Lewis"])

    name_input = st.text_input("Name", value=st.session_state.get("prefill_name", ""))
    case_id_input = st.text_input(
        "Case ID", value=st.session_state.get("prefill_case_id", "")
    )
    address_prefill = st.session_state.get("prefill_address", "")
    if "," in address_prefill:
        prefill_main, prefill_city_zip = address_prefill.rsplit(",", 1)
        prefill_main = prefill_main.strip()
        prefill_city_zip = prefill_city_zip.strip()
    else:
        prefill_main = address_prefill
        prefill_city_zip = ""

    address_main_input = st.text_input("Street Address", value=prefill_main)

    city, state, zip_code = "", "", ""
    city_state_zip_match = re.match(r"(.*),?\s*([A-Z]{2})\s*(\d{5})", prefill_city_zip)
    if city_state_zip_match:
        city, state, zip_code = city_state_zip_match.groups()

    address_city_input = st.text_input("City", value=city.strip())
    address_state_input = st.text_input("State", value=state.strip())
    address_zip_input = st.text_input("ZIP Code", value=zip_code.strip())

    phone_input = st.text_input(
        "Phone Number",
        value=st.session_state.get("prefill_phone", ""),
        placeholder="XXX.XXX.XXXX",
    )
    claim_type = st.selectbox(
        "Claim Type", ["Initial Impairment Claim", "Repeat Impairment Claim"]
    )

    if st.button("Generate EE-10"):
        if client_selection == "Select...":
            st.error("Please select a valid client.")
            return

        record = next(
            (
                rec
                for rec in st.session_state.client_records
                if rec["fields"].get("Name") == client_selection
            ),
            None,
        )
        if not record:
            st.error("Client record not found.")
            return

        form_data = {
            "name": name_input,
            "case_id": case_id_input,
            "address_main": address_main_input,
            "address_city": address_city_input,
            "address_state": address_state_input,
            "address_zip": address_zip_input,
            "phone": phone_input,
            "claim_type": claim_type,
        }

        try:
            generator = EE10Generator()
            filename, pdf_bytes = generator.generate(
                record, doctor_selection, form_data
            )

            st.download_button(
                label=f"Download {filename}",
                data=pdf_bytes.read(),
                file_name=filename,
                mime="application/pdf",
            )
            st.success("EE-10 generated successfully!")
        except Exception as e:
            st.error(f"Error generating EN-11A: {e}")
