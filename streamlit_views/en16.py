import streamlit as st
from dol_portal.access_case_portal import access_case_portal
from generators.en16_generator import EN16Generator
from services.airtable import fetch_clients
import os
from dotenv import load_dotenv

load_dotenv()


def render_en16():
    if "en16_pdf_path" not in st.session_state:
        st.session_state["en16_pdf_path"] = None
    
    st.title("📋 EN-16 Form Generator")
    st.markdown("**Generate Employee Identification Information for Energy Employee**")
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

    # Prefill fields when client changes (pattern from rd_waiver.py)
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
            st.session_state["prefill_claimant"] = full_name
            st.session_state["prefill_case_id"] = fields.get("Case ID", "")
        else:
            st.session_state["prefill_claimant"] = ""
            st.session_state["prefill_case_id"] = ""
    else:
        st.session_state["prefill_claimant"] = ""
        st.session_state["prefill_case_id"] = ""

    st.divider()
    st.subheader("👤 Client Information")
    st.caption("Enter the client's information as it appears in their records")
    
    col1, col2 = st.columns(2, gap="medium")
    
    with col1:
        st.markdown("**👤 Personal Details**")
        claimant = st.text_input(
            "Client's Full Name *", 
            value=st.session_state.get("prefill_claimant", ""),
            help="Client's full legal name as it appears on their official documents"
        )
    
    with col2:
        st.markdown("**📋 Case Information**")
        case_id = st.text_input(
            "Case ID *", 
            value=st.session_state.get("prefill_case_id", ""),
            help="The case identification number assigned to this client"
        )

    st.divider()
    
    # Generate button with better styling
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        generate_button = st.button(
            "🚀 Generate Client's EN-16 Form",
            type="primary",
            use_container_width=True,
            help="Click to generate the completed EN-16 form PDF for this client"
        )
    
    if generate_button:
        # Validation
        errors = []
        if client_selection == "Select...":
            errors.append("Please select a valid client.")
        if not claimant:
            errors.append("Client's full name is required.")
        if not case_id:
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

        # You might want to use claimant/case_id variables here for further processing
        try:
            generator = EN16Generator()
            filename, pdf_bytes = generator.generate(claimant, case_id)
            st.session_state.en16_pdf_name = filename
            st.session_state.en16_pdf_bytes = pdf_bytes.read()
            st.success("🎉 EN-16 form generated successfully for client!")
            st.balloons()  # Celebrate successful form generation!
            st.session_state.en16_generated = True
            st.session_state["en16_claimant"] = claimant
            st.session_state["en16_case_id"] = case_id
            st.session_state["en16_record"] = record
        except Exception as e:
            st.error(f"❌ Error generating EN-16: {e}")

    # Show download and portal access after generation
    if st.session_state.get("en16_pdf_bytes"):
        st.divider()
        st.subheader("📥 Download Form")
        
        col1, col2, col3 = st.columns([1, 2, 1])
        with col2:
            st.download_button(
                label=f"📥 Download {st.session_state.en16_pdf_name}",
                data=st.session_state.en16_pdf_bytes,
                file_name=st.session_state.en16_pdf_name,
                mime="application/pdf",
                type="primary",
                use_container_width=True
            )
        
        # Portal access section
        st.divider()
        st.subheader("🌐 Portal Access")
        
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
                            record = st.session_state["en16_record"]
                            ssn_last4 = record["fields"]["Name"].split("-")[-1].strip()
                            last_name = st.session_state["en16_claimant"].split()[-1]
                            access_case_portal(
                                record,
                                st.session_state["en16_case_id"],
                                last_name,
                                ssn_last4,
                            )
                            st.success("✅ Portal automation completed successfully!")
                        except Exception as e:
                            st.error(f"❌ Portal automation failed: {e}")
        else:
            st.warning("⚠️ Portal automation is only available in local environments with Playwright enabled.")
