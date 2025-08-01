import streamlit as st
from datetime import date, timedelta
from services.airtable import fetch_clients
from generators.ir_notice_la_plata_generator import LaPlataNoticeGenerator
import os
from dol_portal.access_case_portal import access_case_portal


def render_ir_notice_la_plata():
    st.title("🏥 La Plata IR Schedule Notice Generator")
    st.markdown("**Generate Independent Review (IR) Schedule Notice for La Plata**")
    st.info("📝 **For Staff Use:** Create IR schedule notices for clients scheduled for medical review at La Plata.")
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
    selected_client = st.selectbox(
        "Choose which client you're scheduling an IR notice for", 
        ["Select..."] + client_names,
        help="Select an existing client record to auto-populate their basic information"
    )
    
    if selected_client != "Select...":
        st.success(f"✅ Selected: {selected_client}")

    if selected_client != "Select...":
        record = next(
            (
                rec
                for rec in st.session_state.client_records
                if rec["fields"].get("Name") == selected_client
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

            st.session_state["prefill_client_name"] = full_name
            st.session_state["prefill_case_id"] = fields.get("Case ID", "")
        else:
            st.session_state["prefill_client_name"] = ""
            st.session_state["prefill_case_id"] = ""
    else:
        st.session_state["prefill_client_name"] = ""
        st.session_state["prefill_case_id"] = ""

    st.divider()
    st.subheader("👤 Client Information")
    st.caption("Enter the client's information and appointment details")
    
    col1, col2 = st.columns(2, gap="medium")
    
    with col1:
        st.markdown("**👤 Personal Details**")
        client_name = st.text_input(
            "Client's Full Name *", 
            value=st.session_state.get("prefill_client_name", ""),
            help="Client's full legal name as it appears on their official documents"
        )
        case_id = st.text_input(
            "Case ID *", 
            value=st.session_state.get("prefill_case_id", ""),
            help="The case identification number assigned to this client"
        )
    
    with col2:
        st.markdown("**📅 Appointment Information**")
        appointment_date = st.date_input(
            "IR Appointment Date *", 
            value=date.today() + timedelta(days=75),
            help="Select the date when the client's Independent Review is scheduled"
        )

    st.divider()
    
    # Generate button with better styling
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        generate_button = st.button(
            "🚀 Generate Client's IR Notice",
            type="primary",
            use_container_width=True,
            help="Click to generate the completed IR schedule notice PDF for this client"
        )
    
    if generate_button:
        # Validation
        errors = []
        if selected_client == "Select...":
            errors.append("Please select a valid client.")
        if not client_name:
            errors.append("Client's full name is required.")
        if not case_id:
            errors.append("Case ID is required.")
        if not appointment_date:
            errors.append("IR appointment date is required.")
        
        if errors:
            for error in errors:
                st.error(error)
            return

        try:
            generator = LaPlataNoticeGenerator()
            formatted_date = appointment_date.strftime("%m/%d/%Y")
            filename, pdf_bytes = generator.generate(
                client_name, case_id, formatted_date
            )

            st.download_button(
                label=f"📥 Download {filename}",
                data=pdf_bytes,
                file_name=filename,
                mime="application/pdf",
                type="primary"
            )
            st.success("🎉 IR Schedule Notice generated successfully for client!")
            st.balloons()  # Celebrate successful form generation!
            st.session_state["ir_notice_generated"] = True
            st.session_state["ir_notice_record"] = record
            st.session_state["ir_notice_claimant"] = client_name
            st.session_state["ir_notice_case_id"] = case_id
        except Exception as e:
            st.error(f"❌ Error generating IR Schedule Notice: {e}")

    # Portal access section
    if st.session_state.get("ir_notice_generated"):
        st.divider()
        st.subheader("🌐 Portal Access")
        st.info("💡 **Staff Note:** After downloading the notice, you can access the DOL portal to upload it directly.")
        
        if os.getenv("PLAYWRIGHT_ENABLED", "false").lower() == "true":
            col1, col2, col3 = st.columns([1, 2, 1])
            with col2:
                if st.button(
                    "🌐 Access DOL Portal", 
                    type="secondary",
                    use_container_width=True,
                    help="Launch automated portal access to upload the generated notice"
                ):
                    with st.status("🔁 Launching portal automation...", expanded=True):
                        try:
                            record = st.session_state["ir_notice_record"]
                            ssn_last4 = record["fields"]["Name"].split("-")[-1].strip()
                            last_name = st.session_state["ir_notice_claimant"].split()[-1]
                            access_case_portal(
                                record,
                                st.session_state["ir_notice_case_id"],
                                last_name,
                                ssn_last4,
                            )
                            st.success("✅ Portal automation completed successfully!")
                        except Exception as e:
                            st.error(f"❌ Portal automation failed: {e}")
        else:
            st.warning("⚠️ Portal automation is only available in local environments with Playwright enabled.")
