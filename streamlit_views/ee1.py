import streamlit as st
from services.airtable import fetch_clients
from generators.ee1_generator import EE1Generator
from datetime import datetime, date
from utils.state_mapping import get_state_abbreviation


def render_ee1():
    st.title("🏥 EE-1 Form Generator")
    st.markdown("**Generate Worker's Claim for Benefits Under the Energy Employees Occupational Illness Compensation Program Act**")
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
        "Choose which client you're preparing this form for", 
        ["Select..."] + client_names,
        help="Select an existing client record to auto-populate their basic information"
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
                st.session_state["prefill_first_name"] = first
                st.session_state["prefill_last_name"] = last.strip()
            except ValueError:
                # If parsing fails, leave fields empty for manual entry
                st.session_state["prefill_first_name"] = ""
                st.session_state["prefill_last_name"] = ""
            st.session_state["prefill_street_address"] = fields.get("Street Address", "")
            st.session_state["prefill_city"] = fields.get("City", "")
            st.session_state["prefill_state"] = get_state_abbreviation(fields.get("State", ""))
            st.session_state["prefill_zip_code"] = fields.get("ZIP Code", "")
            st.session_state["prefill_phone"] = fields.get("Phone", "")
        else:
            st.session_state["prefill_first_name"] = ""
            st.session_state["prefill_last_name"] = ""
            st.session_state["prefill_street_address"] = ""
            st.session_state["prefill_city"] = ""
            st.session_state["prefill_state"] = ""
            st.session_state["prefill_zip_code"] = ""
            st.session_state["prefill_phone"] = ""
    else:
        st.session_state["prefill_first_name"] = ""
        st.session_state["prefill_last_name"] = ""
        st.session_state["prefill_street_address"] = ""
        st.session_state["prefill_city"] = ""
        st.session_state["prefill_state"] = ""
        st.session_state["prefill_zip_code"] = ""
        st.session_state["prefill_phone"] = ""

    st.divider()
    st.subheader("👤 Client Information")
    st.caption("Enter the client's personal information as it appears on their official documents")
    
    # Form inputs
    col1, col2 = st.columns(2, gap="medium")
    
    with col1:
        st.markdown("**👤 Personal Details**")
        first_name_input = st.text_input(
            "Client's First Name *", 
            value=st.session_state.get("prefill_first_name", ""),
            help="Client's legal first name as it appears on their official documents"
        )
        last_name_input = st.text_input(
            "Client's Last Name *", 
            value=st.session_state.get("prefill_last_name", ""),
            help="Client's legal last name as it appears on their official documents"
        )
        ssn_raw = st.text_input(
            "Client's Social Security Number *", 
            placeholder="123456789",
            help="Enter 9 digits only (dashes will be added automatically)",
            max_chars=9
        )
        
        # Format SSN with dashes
        ssn_input = ""
        if ssn_raw:
            # Remove any non-digits
            digits_only = ''.join(filter(str.isdigit, ssn_raw))
            if len(digits_only) == 9:
                ssn_input = f"{digits_only[:3]}-{digits_only[3:5]}-{digits_only[5:]}"
                st.success(f"✅ Formatted SSN: {ssn_input}")
            elif len(digits_only) > 0:
                ssn_input = digits_only  # Keep partial input for validation
                st.info(f"ℹ️ Enter {9 - len(digits_only)} more digits")
        dob_input = st.date_input(
            "Client's Date of Birth *", 
            value=None,
            min_value=date(1900, 1, 1),
            max_value=datetime.now().date(),
            help="Select the client's date of birth"
        )
        sex_input = st.radio(
            "Client's Sex *", 
            ["Male", "Female"],
            horizontal=True
        )
    
    with col2:
        st.markdown("**🏠 Client's Contact Information**")
        
        address_main_input = st.text_input(
            "Client's Street Address", 
            value=st.session_state.get("prefill_street_address", ""),
            help="Client's street address (include apartment/unit number if applicable)"
        )

        col2a, col2b = st.columns([2, 1])
        with col2a:
            address_city_input = st.text_input(
                "Client's City", 
                value=st.session_state.get("prefill_city", "")
            )
        with col2b:
            address_state_input = st.text_input(
                "Client's State", 
                value=st.session_state.get("prefill_state", ""),
                help="2-letter state code (e.g., NY)",
                max_chars=2
            )
        
        address_zip_input = st.text_input(
            "Client's ZIP Code", 
            value=st.session_state.get("prefill_zip_code", ""),
            help="Client's 5-digit ZIP code",
            max_chars=5
        )

        phone_input = st.text_input(
            "Client's Phone Number",
            value=st.session_state.get("prefill_phone", ""),
            placeholder="555.123.4567",
            help="Client's phone number in format: XXX.XXX.XXXX"
        )

    st.divider()
    st.subheader("🩺 Client's Medical Diagnoses")
    st.markdown("**Client's Diagnosed Condition(s) Being Claimed as Work-Related**")
    
    # Initialize diagnosis categories in session state
    if "diagnosis_categories_ee1" not in st.session_state:
        st.session_state.diagnosis_categories_ee1 = {
            "cancer": {"selected": False, "diagnoses": [{"text": "", "date": None}, {"text": "", "date": None}, {"text": "", "date": None}]},
            "beryllium_sensitivity": {"selected": False, "date": None},
            "chronic_beryllium_disease": {"selected": False, "date": None},
            "chronic_silicosis": {"selected": False, "date": None},
            "other": {"selected": False, "diagnoses": [{"text": "", "date": None}, {"text": "", "date": None}, {"text": "", "date": None}]}
        }
    
    categories = st.session_state.diagnosis_categories_ee1
    
    # Cancer section
    with st.expander("🎗️ **Cancer** (List Specific Diagnosis Below)", expanded=False):
        categories["cancer"]["selected"] = st.checkbox(
            "Client has cancer-related conditions", 
            value=categories["cancer"]["selected"],
            help="Check this box if the client has been diagnosed with any cancer"
        )
        
        if categories["cancer"]["selected"]:
            st.markdown("**Enter up to 3 specific cancer diagnoses for this client:**")
            for i in range(3):
                with st.container():
                    subcol1, subcol2 = st.columns([3, 2])
                    with subcol1:
                        categories["cancer"]["diagnoses"][i]["text"] = st.text_input(
                            f"Cancer diagnosis {chr(97+i).upper()}",
                            value=categories["cancer"]["diagnoses"][i]["text"],
                            key=f"cancer_{i}",
                            placeholder=f"e.g., Lung cancer, Mesothelioma, etc."
                        )
                    with subcol2:
                        if categories["cancer"]["diagnoses"][i]["text"]:
                            categories["cancer"]["diagnoses"][i]["date"] = st.date_input(
                                f"Diagnosis Date {chr(97+i).upper()}",
                                value=categories["cancer"]["diagnoses"][i]["date"],
                                key=f"cancer_date_{i}",
                                min_value=date(1900, 1, 1),
                                max_value=datetime.now().date(),
                                help="Date when the client was diagnosed with this cancer"
                            )
                if i < 2:  # Add separator between entries
                    st.markdown("---")
    
    # Individual condition checkboxes
    st.markdown("**🔬 Specific Occupational Conditions**")
    
    conditions = [
        ("beryllium_sensitivity", "Beryllium Sensitivity", "🟡"),
        ("chronic_beryllium_disease", "Chronic Beryllium Disease (CBD)", "🔴"),
        ("chronic_silicosis", "Chronic Silicosis", "⚫")
    ]
    
    for key, label, icon in conditions:
        with st.container():
            col1, col2 = st.columns([3, 2])
            with col1:
                categories[key]["selected"] = st.checkbox(
                    f"{icon} {label}", 
                    value=categories[key]["selected"],
                    help=f"Check if client has been diagnosed with {label.lower()}"
                )
            with col2:
                if categories[key]["selected"]:
                    categories[key]["date"] = st.date_input(
                        f"Diagnosis Date",
                        value=categories[key]["date"],
                        key=f"{key}_date",
                        min_value=date(1900, 1, 1),
                        max_value=datetime.now().date(),
                        help=f"Date when client was diagnosed with {label.lower()}"
                    )
        st.markdown("")
    
    # Other Work-Related Conditions section
    with st.expander("⚕️ **Other Work-Related Conditions** (Due to exposure to toxic substances or radiation)", expanded=False):
        categories["other"]["selected"] = st.checkbox(
            "Client has other work-related conditions", 
            value=categories["other"]["selected"],
            help="Check this box if the client has conditions not listed above due to toxic substance or radiation exposure"
        )
        
        if categories["other"]["selected"]:
            st.markdown("**Enter up to 3 specific conditions for this client:**")
            for i in range(3):
                with st.container():
                    subcol1, subcol2 = st.columns([3, 2])
                    with subcol1:
                        categories["other"]["diagnoses"][i]["text"] = st.text_input(
                            f"Other condition {chr(97+i).upper()}",
                            value=categories["other"]["diagnoses"][i]["text"],
                            key=f"other_{i}",
                            placeholder=f"e.g., Pulmonary fibrosis, Respiratory disease, etc."
                        )
                    with subcol2:
                        if categories["other"]["diagnoses"][i]["text"]:
                            categories["other"]["diagnoses"][i]["date"] = st.date_input(
                                f"Diagnosis Date {chr(97+i).upper()}",
                                value=categories["other"]["diagnoses"][i]["date"],
                                key=f"other_date_{i}",
                                min_value=date(1900, 1, 1),
                                max_value=datetime.now().date(),
                                help="Date when the client was diagnosed with this condition"
                            )
                if i < 2:  # Add separator between entries
                    st.markdown("---")

    st.divider()
    st.subheader("✍️ Client Signature")
    st.info("📝 **Important:** Upload the client's signature. By signing, the client certifies that all information provided is true and accurate.")
    
    signature_file = st.file_uploader(
        "Upload Client's Signature *", 
        type=['png', 'jpg', 'jpeg'],
        help="Upload a clear image file of the client's signature (PNG, JPG, or JPEG format)"
    )
    
    if signature_file:
        st.success("✅ Client signature uploaded successfully")
        # Optional: Show a preview of the signature
        with st.expander("Preview Client Signature"):
            st.image(signature_file, caption="Client's Signature", width=300)

    st.divider()
    
    # Generate button with better styling
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        generate_button = st.button(
            "🚀 Generate Client's EE-1 Form",
            type="primary",
            use_container_width=True,
            help="Click to generate the completed EE-1 form PDF for this client"
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
        if not first_name_input:
            errors.append("Client's first name is required.")
        if not last_name_input:
            errors.append("Client's last name is required.")
        if not ssn_input:
            errors.append("Client's Social Security Number is required.")
        if not dob_input:
            errors.append("Client's Date of Birth is required.")
        # Validate at least one diagnosis category is selected
        categories = st.session_state.diagnosis_categories_ee1
        has_valid_diagnosis = False
        
        # Check Cancer
        if categories["cancer"]["selected"]:
            cancer_has_valid = False
            for i, cancer_diag in enumerate(categories["cancer"]["diagnoses"]):
                if cancer_diag["text"]:
                    if cancer_diag["date"]:
                        cancer_has_valid = True
                    else:
                        errors.append(f"Cancer diagnosis {chr(97+i)} requires a date.")
            if cancer_has_valid:
                has_valid_diagnosis = True
            elif not any(d["text"] for d in categories["cancer"]["diagnoses"]):
                errors.append("At least one specific cancer diagnosis is required when Cancer is selected.")
        
        # Check individual conditions
        for key, label in [("beryllium_sensitivity", "Beryllium Sensitivity"), 
                          ("chronic_beryllium_disease", "Chronic Beryllium Disease"), 
                          ("chronic_silicosis", "Chronic Silicosis")]:
            if categories[key]["selected"]:
                if categories[key]["date"]:
                    has_valid_diagnosis = True
                else:
                    errors.append(f"{label} date of diagnosis is required when {label} is selected.")
        
        # Check Other conditions
        if categories["other"]["selected"]:
            other_has_valid = False
            for i, other_diag in enumerate(categories["other"]["diagnoses"]):
                if other_diag["text"]:
                    if other_diag["date"]:
                        other_has_valid = True
                    else:
                        errors.append(f"Other condition {chr(97+i)} requires a date.")
            if other_has_valid:
                has_valid_diagnosis = True
            elif not any(d["text"] for d in categories["other"]["diagnoses"]):
                errors.append("At least one specific other condition is required when Other is selected.")
        
        if not has_valid_diagnosis:
            errors.append("At least one diagnosis category with date is required.")
        if not signature_file:
            errors.append("Client signature is required.")
        
        # Validate SSN format
        if ssn_raw:
            digits_only = ''.join(filter(str.isdigit, ssn_raw))
            if len(digits_only) != 9:
                errors.append("Client's Social Security Number must be exactly 9 digits.")
        elif not ssn_input:
            errors.append("Client's Social Security Number is required.")
        
        # Validate date logic
        if dob_input and dob_input >= datetime.now().date():
            errors.append("Client's Date of Birth must be in the past.")
        
        # Validate diagnosis dates
        # Individual conditions
        for key, label in [("beryllium_sensitivity", "Beryllium Sensitivity"),
                          ("chronic_beryllium_disease", "Chronic Beryllium Disease"), 
                          ("chronic_silicosis", "Chronic Silicosis")]:
            if categories[key]["selected"] and categories[key]["date"]:
                if categories[key]["date"] > datetime.now().date():
                    errors.append(f"{label} date cannot be in the future.")
                if dob_input and categories[key]["date"] <= dob_input:
                    errors.append(f"{label} date must be after Date of Birth.")
        
        # Cancer individual dates
        if categories["cancer"]["selected"]:
            for i, cancer_diag in enumerate(categories["cancer"]["diagnoses"]):
                if cancer_diag["text"] and cancer_diag["date"]:
                    if cancer_diag["date"] > datetime.now().date():
                        errors.append(f"Cancer diagnosis {chr(97+i)} date cannot be in the future.")
                    if dob_input and cancer_diag["date"] <= dob_input:
                        errors.append(f"Cancer diagnosis {chr(97+i)} date must be after Date of Birth.")
        
        # Other individual dates  
        if categories["other"]["selected"]:
            for i, other_diag in enumerate(categories["other"]["diagnoses"]):
                if other_diag["text"] and other_diag["date"]:
                    if other_diag["date"] > datetime.now().date():
                        errors.append(f"Other condition {chr(97+i)} date cannot be in the future.")
                    if dob_input and other_diag["date"] <= dob_input:
                        errors.append(f"Other condition {chr(97+i)} date must be after Date of Birth.")

        if errors:
            for error in errors:
                st.error(error)
            return

        form_data = {
            "first_name": first_name_input,
            "last_name": last_name_input,
            "ssn": ssn_input,
            "dob": dob_input,
            "sex": sex_input,
            "address_main": address_main_input,
            "address_city": address_city_input,
            "address_state": address_state_input,
            "address_zip": address_zip_input,
            "phone": phone_input,
            "diagnosis_categories": categories,
            "signature_file": signature_file,
        }

        try:
            generator = EE1Generator()
            filename, pdf_bytes = generator.generate(record, form_data)

            st.download_button(
                label=f"Download {filename}",
                data=pdf_bytes.read(),
                file_name=filename,
                mime="application/pdf",
            )
            st.success("🎉 EE-1 form generated successfully for client!")
            st.balloons()  # Celebrate successful form generation!

            st.session_state["ee1_record"] = record
            st.session_state["ee1_claimant"] = f"{last_name_input}, {first_name_input}"
            st.session_state["ee1_case_id"] = record["fields"].get("Case ID", "")
            st.session_state["ee1_generated"] = True

        except Exception as e:
            st.error(f"Error generating EE-1: {e}")