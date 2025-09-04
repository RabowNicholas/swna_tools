import streamlit as st
from services.airtable import fetch_clients
from generators.withdrawal_letter_generator import WithdrawalLetterGenerator
from datetime import datetime
import os


def render_withdrawal_letter():
    st.title("📄 Withdrawal Letter Generator")
    st.markdown("**Generate withdrawal letter for client's claim**")
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
        "Choose which client you're preparing this withdrawal letter for", 
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
    st.subheader("📝 Withdrawal Letter Details")
    
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
        st.markdown("**📅 Letter Details**")
        letter_date = st.date_input(
            "Letter Date *", 
            value=datetime.now().date(),
            help="Date for the withdrawal letter"
        )
        
        claimed_condition = st.text_input(
            "Claimed Condition *",
            placeholder="e.g., Lung cancer, Beryllium sensitivity, etc.",
            help="The specific condition being withdrawn from the claim"
        )

    st.divider()
    
    # Generate button
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        generate_button = st.button(
            "🚀 Generate Withdrawal Letter",
            type="primary",
            use_container_width=True,
            help="Click to generate the withdrawal letter PDF"
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
        if not letter_date:
            errors.append("Letter date is required.")
        if not claimed_condition:
            errors.append("Claimed condition is required.")
        
        if not record:
            errors.append("Client record not found.")

        if errors:
            for error in errors:
                st.error(error)
            return

        form_data = {
            "claimant_name": claimant_name_input,
            "case_id": case_id_input,
            "letter_date": letter_date,
            "claimed_condition": claimed_condition,
        }

        try:
            generator = WithdrawalLetterGenerator()
            filename, pdf_bytes = generator.generate(record, form_data)

            st.download_button(
                label=f"Download {filename}",
                data=pdf_bytes.read(),
                file_name=filename,
                mime="application/pdf",
            )
            st.success("🎉 Withdrawal letter generated successfully!")
            st.balloons()

            # Store data for potential portal access
            st.session_state["withdrawal_letter_record"] = record
            st.session_state["withdrawal_letter_claimant"] = claimant_name_input
            st.session_state["withdrawal_letter_case_id"] = case_id_input
            st.session_state["withdrawal_letter_generated"] = True

        except Exception as e:
            st.error(f"Error generating withdrawal letter: {e}")

    # Portal access button - only show if withdrawal letter was generated and playwright is enabled
    if st.session_state.get("withdrawal_letter_generated", False):
        st.divider()
        
        if os.getenv("PLAYWRIGHT_ENABLED", "false").lower() == "true":
            col1, col2, col3 = st.columns([1, 2, 1])
            with col2:
                if st.button(
                    "🌐 Access DOL Portal", 
                    type="secondary",
                    use_container_width=True,
                    help="Launch automated portal access to submit the withdrawal letter"
                ):
                    with st.status("🔁 Launching portal automation...", expanded=True):
                        try:
                            record = st.session_state["withdrawal_letter_record"]
                            ssn_last4 = record["fields"]["Name"].split("-")[-1].strip()
                            last_name = st.session_state["withdrawal_letter_claimant"].split()[-1]
                            case_id = st.session_state["withdrawal_letter_case_id"]

                            st.write(f"🔍 Accessing portal for: {st.session_state['withdrawal_letter_claimant']}")
                            st.write(f"📋 Case ID: {case_id}")
                            st.write(f"🔢 SSN Last 4: {ssn_last4}")

                            from dol_portal.access_case_portal import access_portal

                            access_portal(case_id, last_name, ssn_last4)
                            st.success("✅ Portal automation completed successfully!")

                        except Exception as e:
                            st.error(f"❌ Portal automation failed: {e}")
        else:
            st.info("🔧 Portal automation is not enabled. Contact your system administrator to enable this feature.")