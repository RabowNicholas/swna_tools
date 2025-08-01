import streamlit as st
from services.airtable import fetch_clients
from generators.ee10_generator import EE10Generator
import re
import os
from dol_portal.access_case_portal import access_case_portal


def render_ee10():
    st.title("🏥 EE-10 Form Generator")
    st.markdown("**Generate Request for Assistance in Obtaining Employment Records or Other Information**")
    st.info("📝 **For Staff Use:** Complete this form on behalf of your client to request employment records and other information.")
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
    st.subheader("🩺 Doctor Selection")
    st.caption("Select the medical professional who will be handling this case")
    doctor_selection = st.selectbox(
        "Choose Doctor *", 
        ["La Plata", "Dr. Lewis"],
        help="Select the doctor who will review the employment records"
    )

    st.divider()
    st.subheader("👤 Client Information")
    st.caption("Enter the client's information as it appears in their records")
    
    # Form inputs
    col1, col2 = st.columns(2, gap="medium")
    
    with col1:
        st.markdown("**👤 Personal Details**")
        name_input = st.text_input(
            "Client's Full Name *", 
            value=st.session_state.get("prefill_name", ""),
            help="Client's full legal name as it appears on their official documents"
        )
        case_id_input = st.text_input(
            "Case ID *", 
            value=st.session_state.get("prefill_case_id", ""),
            help="The case identification number assigned to this client"
        )
    with col2:
        st.markdown("**🏠 Client's Contact Information**")
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
            "Client's Street Address", 
            value=prefill_main,
            help="Client's street address (include apartment/unit number if applicable)"
        )

        city, state, zip_code = "", "", ""
        city_state_zip_match = re.match(r"(.*),?\s*([A-Z]{2})\s*(\d{5})", prefill_city_zip)
        if city_state_zip_match:
            city, state, zip_code = city_state_zip_match.groups()

        col2a, col2b = st.columns([2, 1])
        with col2a:
            address_city_input = st.text_input("Client's City", value=city.strip())
        with col2b:
            address_state_input = st.text_input(
                "Client's State", 
                value=state.strip(),
                help="2-letter state code (e.g., NY)",
                max_chars=2
            )
        
        address_zip_input = st.text_input(
            "Client's ZIP Code", 
            value=zip_code.strip(),
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
    st.subheader("📋 Claim Information")
    st.caption("Specify the type of claim being processed for this client")
    claim_type = st.selectbox(
        "Claim Type *", 
        ["Initial Impairment Claim", "Repeat Impairment Claim"],
        help="Select whether this is the client's first impairment claim or a repeat claim"
    )

    st.divider()
    
    # Generate button with better styling
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        generate_button = st.button(
            "🚀 Generate Client's EE-10 Form",
            type="primary",
            use_container_width=True,
            help="Click to generate the completed EE-10 form PDF for this client"
        )
    
    if generate_button:
        # Validation
        errors = []
        if client_selection == "Select...":
            errors.append("Please select a valid client.")
        if not name_input:
            errors.append("Client's full name is required.")
        if not case_id_input:
            errors.append("Case ID is required.")
        
        if errors:
            for error in errors:
                st.error(error)
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
                label=f"📥 Download {filename}",
                data=pdf_bytes.read(),
                file_name=filename,
                mime="application/pdf",
                type="primary"
            )
            st.success("🎉 EE-10 form generated successfully for client!")
            st.balloons()  # Celebrate successful form generation!

            st.session_state["ee10_record"] = record
            st.session_state["ee10_claimant"] = name_input
            st.session_state["ee10_case_id"] = case_id_input
            st.session_state["ee10_generated"] = True

        except Exception as e:
            st.error(f"❌ Error generating EE-10: {e}")

    # Portal access section
    if st.session_state.get("ee10_generated"):
        st.divider()
        st.subheader("🌐 Portal Access")
        st.info("💡 **Staff Note:** After downloading the form, you can access the DOL portal to upload it directly.")
        
        if os.getenv("PLAYWRIGHT_ENABLED", "false").lower() == "true":
            col1, col2, col3 = st.columns([1, 2, 1])
            with col2:
                if st.button(
                    "🌐 Access DOL Portal", 
                    type="secondary",
                    use_container_width=True,
                    help="Launch automated portal access to upload the generated form"
                ):
                    with st.status("🔁 Launching portal automation...", expanded=True):
                        try:
                            record = st.session_state["ee10_record"]
                            ssn_last4 = record["fields"]["Name"].split("-")[-1].strip()
                            last_name = st.session_state["ee10_claimant"].split()[-1]
                            access_case_portal(
                                record,
                                st.session_state["ee10_case_id"],
                                last_name,
                                ssn_last4,
                            )
                            st.success("✅ Portal automation completed successfully!")
                        except Exception as e:
                            st.error(f"❌ Portal automation failed: {e}")
        else:
            st.warning("⚠️ Portal automation is only available in local environments with Playwright enabled.")
