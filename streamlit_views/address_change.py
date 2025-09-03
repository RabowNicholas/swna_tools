import streamlit as st
from services.airtable import fetch_clients
from generators.address_change_generator import AddressChangeGenerator
import os


def render_address_change():
    st.title("🏠 Address Change Letter Generator")
    st.markdown("**Generate address change letter for client**")
    st.info("📝 **For Staff Use:** Complete this form to generate an address change letter for your client.")
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
        "Choose which client you're preparing this address change letter for", 
        ["Select..."] + client_names,
        help="Select an existing client record to auto-populate their information"
    )
    
    if client_selection != "Select...":
        st.success(f"✅ Selected: {client_selection}")

    # Get client record and auto-populate fields
    record = None
    claimant_name = ""
    case_id = ""
    
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
                claimant_name = f"{first} {last.strip()}"
            except ValueError:
                claimant_name = raw_name
            case_id = fields.get("Case ID", "")

    st.divider()
    st.subheader("📝 Address Change Details")
    
    col1, col2 = st.columns(2, gap="medium")
    
    with col1:
        st.markdown("**👤 Client Information**")
        claimant_name_input = st.text_input(
            "Claimant Name *", 
            value=claimant_name,
            help="Client's full name as it should appear in the letter",
            disabled=client_selection == "Select..."
        )
        
        case_id_input = st.text_input(
            "Case ID *", 
            value=case_id,
            help="Case ID from Airtable client record",
            disabled=client_selection == "Select..."
        )
    
    with col2:
        st.markdown("**🏠 New Address Information**")
        street_address = st.text_input(
            "Street Address *",
            placeholder="123 Main Street",
            help="New street address for the client"
        )
        
        col2a, col2b, col2c = st.columns([2, 1, 1])
        with col2a:
            city = st.text_input(
                "City *",
                placeholder="Anytown",
                help="City for the new address"
            )
        with col2b:
            state = st.text_input(
                "State *",
                placeholder="ST",
                help="State abbreviation (e.g., CA, NY)"
            )
        with col2c:
            zip_code = st.text_input(
                "ZIP Code *",
                placeholder="12345",
                help="5-digit ZIP code"
            )

    st.divider()
    
    # Generate button
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        generate_button = st.button(
            "🚀 Generate Address Change Letter",
            type="primary",
            use_container_width=True,
            help="Click to generate the address change letter PDF"
        )
    
    if generate_button:
        # Validation
        errors = []
        
        if client_selection == "Select...":
            errors.append("Please select a valid client.")
        if not claimant_name_input:
            errors.append("Claimant name is required.")
        if not case_id_input:
            errors.append("Case ID is required.")
        if not street_address:
            errors.append("Street address is required.")
        if not city:
            errors.append("City is required.")
        if not state:
            errors.append("State is required.")
        if not zip_code:
            errors.append("ZIP code is required.")
        
        if not record:
            errors.append("Client record not found.")

        if errors:
            for error in errors:
                st.error(error)
            return

        form_data = {
            "claimant_name": claimant_name_input,
            "case_id": case_id_input,
            "street_address": street_address,
            "city": city,
            "state": state,
            "zip_code": zip_code,
        }

        try:
            generator = AddressChangeGenerator()
            filename, pdf_bytes = generator.generate(record, form_data)

            st.download_button(
                label=f"Download {filename}",
                data=pdf_bytes.read(),
                file_name=filename,
                mime="application/pdf",
            )
            st.success("🎉 Address change letter generated successfully!")
            st.balloons()

            # Store data for potential portal access
            st.session_state["address_change_record"] = record
            st.session_state["address_change_claimant"] = claimant_name_input
            st.session_state["address_change_case_id"] = case_id_input
            st.session_state["address_change_generated"] = True

        except Exception as e:
            st.error(f"Error generating address change letter: {e}")

    # Portal access button - only show if address change letter was generated and playwright is enabled
    if st.session_state.get("address_change_generated", False):
        st.divider()
        
        if os.getenv("PLAYWRIGHT_ENABLED", "false").lower() == "true":
            col1, col2, col3 = st.columns([1, 2, 1])
            with col2:
                if st.button(
                    "🌐 Access DOL Portal", 
                    type="secondary",
                    use_container_width=True,
                    help="Launch automated portal access to submit the address change letter"
                ):
                    with st.status("🔁 Launching portal automation...", expanded=True):
                        try:
                            record = st.session_state["address_change_record"]
                            ssn_last4 = record["fields"]["Name"].split("-")[-1].strip()
                            last_name = st.session_state["address_change_claimant"].split()[-1]
                            case_id = st.session_state["address_change_case_id"]

                            st.write(f"🔍 Accessing portal for: {st.session_state['address_change_claimant']}")
                            st.write(f"📋 Case ID: {case_id}")
                            st.write(f"🔢 SSN Last 4: {ssn_last4}")

                            from dol_portal.access_case_portal import access_portal

                            access_portal(case_id, last_name, ssn_last4)
                            st.success("✅ Portal automation completed successfully!")

                        except Exception as e:
                            st.error(f"❌ Portal automation failed: {e}")
        else:
            st.info("🔧 Portal automation is not enabled. Contact your system administrator to enable this feature.")