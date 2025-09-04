import streamlit as st
from services.airtable import fetch_clients
from generators.ee1a_generator import EE1AGenerator
import re
import os
from dol_portal.access_case_portal import access_case_portal


def render_ee1a():
    st.title("🏥 EE-1a Form Generator")
    st.markdown("**Generate Claim for Consequential Illness Benefits Under the Energy Employees Occupational Illness Compensation Program Act**")
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
            st.session_state["prefill_case_id"] = fields.get("Case ID", "")
            st.session_state["prefill_address"] = fields.get("Address", "")
            st.session_state["prefill_phone"] = fields.get("Phone", "")
        else:
            st.session_state["prefill_first_name"] = ""
            st.session_state["prefill_last_name"] = ""
            st.session_state["prefill_case_id"] = ""
            st.session_state["prefill_address"] = ""
            st.session_state["prefill_phone"] = ""
    else:
        st.session_state["prefill_first_name"] = ""
        st.session_state["prefill_last_name"] = ""
        st.session_state["prefill_case_id"] = ""
        st.session_state["prefill_address"] = ""
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
        case_id_input = st.text_input(
            "Case ID Number *", 
            value=st.session_state.get("prefill_case_id", ""),
            help="The existing case ID for the client's accepted illness"
        )
    
    # Address parsing and inputs
    address_prefill = st.session_state.get("prefill_address", "")
    if "," in address_prefill:
        prefill_main, prefill_city_zip = address_prefill.rsplit(",", 1)
        prefill_main = prefill_main.strip()
        prefill_city_zip = prefill_city_zip.strip()
    else:
        prefill_main = address_prefill
        prefill_city_zip = ""

    with col2:
        st.markdown("**📍 Address & Contact**")
        address_main_input = st.text_input(
            "Street Address *", 
            value=prefill_main,
            help="Street address, apartment number, or P.O. Box"
        )

        city, state, zip_code = "", "", ""
        city_state_zip_match = re.match(r"(.*),?\s*([A-Z]{2})\s*(\d{5})", prefill_city_zip)
        if city_state_zip_match:
            city, state, zip_code = city_state_zip_match.groups()

        col2a, col2b, col2c = st.columns([2, 1, 1])
        with col2a:
            address_city_input = st.text_input("City *", value=city.strip())
        with col2b:
            address_state_input = st.text_input("State *", value=state.strip(), max_chars=2)
        with col2c:
            address_zip_input = st.text_input("ZIP Code *", value=zip_code.strip(), max_chars=5)

        phone_input = st.text_input(
            "Home Phone Number",
            value=st.session_state.get("prefill_phone", ""),
            placeholder="XXX.XXX.XXXX",
            help="Primary contact phone number"
        )

    st.divider()
    # Multiple diagnoses section
    st.subheader("🩺 Consequential Illness Information")
    st.caption("List the specific medical diagnoses that occurred or worsened because of the client's already-accepted work-related illness")
    
    # Initialize diagnoses in session state if not exists
    if "diagnoses_ee1a" not in st.session_state:
        st.session_state.diagnoses_ee1a = [{"diagnosis": "", "date": None}]
    
    diagnoses = st.session_state.diagnoses_ee1a
    
    # Display current diagnoses
    for i, diag in enumerate(diagnoses):
        col1, col2, col3 = st.columns([3, 2, 1])
        with col1:
            diagnoses[i]["diagnosis"] = st.text_input(
                f"Consequential Illness #{i+1}", 
                value=diag["diagnosis"], 
                key=f"diag_{i}",
                help="Specific medical diagnosis only (not symptoms like pain or cough)"
            )
        with col2:
            diagnoses[i]["date"] = st.date_input(
                f"Date of Diagnosis #{i+1}", 
                value=diag["date"], 
                key=f"date_{i}",
                help="Date when this condition was diagnosed"
            )
        with col3:
            if len(diagnoses) > 1:
                if st.button(f"Remove", key=f"remove_{i}"):
                    diagnoses.pop(i)
                    st.rerun()
    
    # Add/Remove diagnosis buttons
    col1, col2 = st.columns(2)
    with col1:
        if st.button("➕ Add Another Diagnosis") and len(diagnoses) < 5:
            st.session_state.diagnoses_ee1a.append({"diagnosis": "", "date": None})
            st.rerun()
    with col2:
        if len(diagnoses) >= 5:
            st.caption("⚠️ Maximum 5 diagnoses allowed per form")
    
    st.divider()
    # Employee signature upload
    st.subheader("✍️ Signature")
    st.caption("Upload an image of the employee's signature")
    signature_file = st.file_uploader(
        "Upload Employee Signature", 
        type=['png', 'jpg', 'jpeg'],
        help="Upload an image file of the employee's signature"
    )

    st.divider()
    
    # Generate button with better styling
    generate_col1, generate_col2, generate_col3 = st.columns([1, 2, 1])
    with generate_col2:
        generate_button = st.button(
            "🏥 Generate EE-1a Form", 
            type="primary", 
            use_container_width=True,
            help="Generate the completed EE-1a form PDF"
        )
    
    if generate_button:
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

        # Validate required fields
        if not first_name_input:
            st.error("First name is required.")
            return
        if not last_name_input:
            st.error("Last name is required.")
            return
        
        if not case_id_input:
            st.error("Case ID is required.")
            return
            
        # Validate at least one diagnosis
        valid_diagnoses = [d for d in diagnoses if d["diagnosis"] and d["date"]]
        if not valid_diagnoses:
            st.error("At least one diagnosis with date is required.")
            return
            
        if not signature_file:
            st.error("Employee signature is required.")
            return

        form_data = {
            "first_name": first_name_input,
            "last_name": last_name_input,
            "case_id": case_id_input,
            "address_main": address_main_input,
            "address_city": address_city_input,
            "address_state": address_state_input,
            "address_zip": address_zip_input,
            "phone": phone_input,
            "diagnoses": valid_diagnoses,
            "signature_file": signature_file,
        }

        try:
            generator = EE1AGenerator()
            filename, pdf_bytes = generator.generate(record, form_data)

            st.download_button(
                label=f"Download {filename}",
                data=pdf_bytes.read(),
                file_name=filename,
                mime="application/pdf",
            )
            st.success("EE-1a generated successfully!")

            st.session_state["ee1a_record"] = record
            st.session_state["ee1a_claimant"] = f"{last_name_input}, {first_name_input}"
            st.session_state["ee1a_case_id"] = case_id_input
            st.session_state["ee1a_generated"] = True

        except Exception as e:
            st.error(f"Error generating EE-1a: {e}")

    if st.session_state.get("ee1a_generated"):
        if os.getenv("PLAYWRIGHT_ENABLED", "false").lower() == "true":
            if st.button("Access Portal"):
                with st.status("🔁 Launching portal automation...", expanded=True):
                    try:
                        record = st.session_state["ee1a_record"]
                        ssn_last4 = record["fields"]["Name"].split("-")[-1].strip()
                        last_name = st.session_state["ee1a_claimant"].split(",")[0].strip()
                        access_case_portal(
                            record,
                            st.session_state["ee1a_case_id"],
                            last_name,
                            ssn_last4,
                        )
                        st.success("✅ Upload script completed.")
                    except Exception as e:
                        st.error(f"❌ Upload script failed: {e}")
        else:
            st.caption("⚠️ Portal automation is only available in local environments.")