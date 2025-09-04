import streamlit as st
from services.airtable import fetch_clients
from generators.desert_pulm_referral_generator import DesertPulmReferralGenerator
from datetime import datetime


def render_desert_pulm_referral():
    st.title("🫁 Desert Pulmonary Referral Form Generator")
    st.markdown("**Generate Referral Form for Desert Pulmonary Rehab & Diagnostics**")
    st.divider()

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
    
    st.subheader("📋 Client Selection")
    client_selection = st.selectbox(
        "Choose which client you're preparing this referral for", 
        ["Select..."] + client_names,
        help="Select an existing client record to auto-populate their information"
    )
    
    if client_selection != "Select...":
        st.success(f"✅ Selected: {client_selection}")

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

    st.divider()
    st.subheader("📄 Referral Information")
    
    # Referral date (auto-set to today)
    referral_date = datetime.now().date()
    st.info(f"📅 **Referral Date:** {referral_date.strftime('%m/%d/%Y')} (automatically set to today)")
    
    st.divider()
    st.subheader("👤 Patient Information")
    st.caption("Enter the patient's information as it appears in their records")
    
    # Form inputs
    col1, col2 = st.columns(2, gap="medium")
    
    with col1:
        st.markdown("**👤 Personal Details**")
        patient_name_input = st.text_input(
            "Patient's Full Name *", 
            value=st.session_state.get("prefill_name", ""),
            help="Patient's full legal name as it appears on their official documents"
        )
        case_id_input = st.text_input(
            "Case ID *", 
            value=st.session_state.get("prefill_case_id", ""),
            help="The case identification number assigned to this patient"
        )
        phone_input = st.text_input(
            "Patient's Phone Number",
            value=st.session_state.get("prefill_phone", ""),
            placeholder="555.123.4567",
            help="Patient's phone number in format: XXX.XXX.XXXX"
        )
        
    with col2:
        st.markdown("**🏠 Patient's Contact Information**")
        # Address parsing and inputs
        address_prefill = st.session_state.get("prefill_address", "")
        if "," in address_prefill:
            prefill_main, prefill_city_zip = address_prefill.rsplit(",", 1)
            prefill_main = prefill_main.strip()
            prefill_city_zip = prefill_city_zip.strip()
        else:
            prefill_main = address_prefill
            prefill_city_zip = ""

        address_main_input = st.text_input(
            "Patient's Street Address *", 
            value=prefill_main,
            help="Patient's street address (include apartment/unit number if applicable)"
        )

        city, state, zip_code = "", "", ""
        import re
        city_state_zip_match = re.match(r"(.*),?\s*([A-Z]{2})\s*(\d{5})", prefill_city_zip)
        if city_state_zip_match:
            city, state, zip_code = city_state_zip_match.groups()

        col2a, col2b = st.columns([2, 1])
        with col2a:
            address_city_input = st.text_input("Patient's City *", value=city.strip())
        with col2b:
            address_state_input = st.text_input(
                "Patient's State *", 
                value=state.strip(),
                help="2-letter state code (e.g., NY)",
                max_chars=2
            )
        
        address_zip_input = st.text_input(
            "Patient's ZIP Code *", 
            value=zip_code.strip(),
            help="Patient's 5-digit ZIP code",
            max_chars=5
        )
        
        # Date of Birth (manual input)
        from datetime import date
        dob_input = st.date_input(
            "Date of Birth *",
            value=None,
            min_value=date(1900, 1, 1),
            max_value=datetime.now().date(),
            help="Enter the patient's date of birth"
        )

    st.divider()
    st.subheader("🩺 Medical Information")
    
    # DX field dropdown with predefined options
    dx_options = [
        "Select diagnosis...",
        "Silicosis (J62.8)",
        "Obstructive sleep apnea (G47.33)",
        "Hypoxemia (R06.02)",
        "Other (enter custom code)"
    ]
    
    dx_selection = st.selectbox(
        "DX (Diagnosis) *",
        dx_options,
        help="Select the diagnosis from the final decision"
    )
    
    # If "Other" is selected, show text input
    dx_code_input = ""
    if dx_selection == "Other (enter custom code)":
        dx_code_input = st.text_input(
            "Enter Custom ICD Code *",
            placeholder="Enter ICD diagnosis code",
            help="Enter the custom ICD code from the final decision"
        )
    elif dx_selection != "Select diagnosis...":
        # Extract the code from the selected option
        dx_code_input = dx_selection


    st.divider()
    
    # Generate button
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        generate_button = st.button(
            "🚀 Generate Desert Pulmonary Referral",
            type="primary",
            use_container_width=True,
            help="Click to generate the completed referral form PDF"
        )
    
    if generate_button:
        # Validation
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

        # Required field validation
        errors = []
        if not patient_name_input:
            errors.append("Patient's full name is required.")
        if not case_id_input:
            errors.append("Case ID is required.")
        if not dob_input:
            errors.append("Date of Birth is required.")
        if not address_main_input:
            errors.append("Street address is required.")
        if not address_city_input:
            errors.append("City is required.")
        if not address_state_input:
            errors.append("State is required.")
        if not address_zip_input:
            errors.append("ZIP code is required.")
        # Validate DX selection
        if dx_selection == "Select diagnosis...":
            errors.append("Please select a diagnosis.")
        elif dx_selection == "Other (enter custom code)" and not dx_code_input:
            errors.append("Please enter a custom ICD code.")
        

        if errors:
            for error in errors:
                st.error(error)
            return

        form_data = {
            "patient_name": patient_name_input,
            "phone_number": phone_input,
            "dob": dob_input,
            "case_id": case_id_input,
            "address_main": address_main_input,
            "address_city": address_city_input,
            "address_state": address_state_input,
            "address_zip": address_zip_input,
            "dx_code": dx_code_input,
        }

        try:
            generator = DesertPulmReferralGenerator()
            filename, pdf_bytes = generator.generate(record, form_data)

            st.download_button(
                label=f"Download {filename}",
                data=pdf_bytes.read(),
                file_name=filename,
                mime="application/pdf",
            )
            st.success("🎉 Desert Pulmonary referral form generated successfully!")
            st.balloons()

        except Exception as e:
            st.error(f"Error generating referral form: {e}")