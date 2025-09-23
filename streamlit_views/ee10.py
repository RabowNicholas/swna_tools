import streamlit as st
from services.airtable import fetch_clients
from generators.ee10_generator import EE10Generator
from services.email_service import EmailService
from config.email_config import (
    detect_client_status,
    get_email_recipients,
    is_hhc_client,
)
from templates.email_templates import format_ir_email, get_subject_line
import os
from dol_portal.access_case_portal import access_case_portal
from utils.state_mapping import get_state_abbreviation


def render_ee10():
    st.title("🏥 EE-10 Form Generator")
    st.markdown(
        "**Generate Request for Assistance in Obtaining Employment Records or Other Information**"
    )
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
        help="Select an existing client record to auto-populate their basic information",
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
            st.session_state["prefill_street_address"] = fields.get("Street Address", "")
            st.session_state["prefill_city"] = fields.get("City", "")
            st.session_state["prefill_state"] = get_state_abbreviation(fields.get("State", ""))
            st.session_state["prefill_zip_code"] = fields.get("ZIP Code", "")
            st.session_state["prefill_phone"] = fields.get("Phone", "")
        else:
            st.session_state["prefill_name"] = ""
            st.session_state["prefill_case_id"] = ""
            st.session_state["prefill_street_address"] = ""
            st.session_state["prefill_city"] = ""
            st.session_state["prefill_state"] = ""
            st.session_state["prefill_zip_code"] = ""
            st.session_state["prefill_phone"] = ""
    else:
        st.session_state["prefill_name"] = ""
        st.session_state["prefill_case_id"] = ""
        st.session_state["prefill_street_address"] = ""
        st.session_state["prefill_city"] = ""
        st.session_state["prefill_state"] = ""
        st.session_state["prefill_zip_code"] = ""
        st.session_state["prefill_phone"] = ""

    st.divider()
    st.subheader("🩺 Doctor Selection")
    st.caption("Select the medical professional who will be handling this case")
    doctor_selection = st.selectbox(
        "Choose Doctor *",
        ["La Plata", "Dr. Lewis"],
        help="Select the doctor who will review the employment records",
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
            help="Client's full legal name as it appears on their official documents",
        )
        case_id_input = st.text_input(
            "Case ID *",
            value=st.session_state.get("prefill_case_id", ""),
            help="The case identification number assigned to this client",
        )
    with col2:
        st.markdown("**🏠 Client's Contact Information**")
        address_main_input = st.text_input(
            "Client's Street Address",
            value=st.session_state.get("prefill_street_address", ""),
            help="Client's street address (include apartment/unit number if applicable)",
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
                max_chars=2,
            )

        address_zip_input = st.text_input(
            "Client's ZIP Code",
            value=st.session_state.get("prefill_zip_code", ""),
            help="Client's 5-digit ZIP code",
            max_chars=5,
        )

        phone_input = st.text_input(
            "Client's Phone Number",
            value=st.session_state.get("prefill_phone", ""),
            placeholder="555.123.4567",
            help="Client's phone number in format: XXX.XXX.XXXX",
        )

    st.divider()
    st.subheader("📋 Claim Information")
    st.caption("Specify the type of claim being processed for this client")
    claim_type = st.selectbox(
        "Claim Type *",
        ["Initial Impairment Claim", "Repeat Impairment Claim"],
        help="Select whether this is the client's first impairment claim or a repeat claim",
    )

    st.divider()

    # Generate button with better styling
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        generate_button = st.button(
            "🚀 Generate Client's EE-10 Form",
            type="primary",
            use_container_width=True,
            help="Click to generate the completed EE-10 form PDF for this client",
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
                type="primary",
            )
            st.success("🎉 EE-10 form generated successfully for client!")
            st.balloons()  # Celebrate successful form generation!

            # Store form data for email reuse
            full_address = f"{address_main_input} "
            if address_city_input or address_state_input or address_zip_input:
                full_address += f"\n{address_city_input}, {address_state_input} {address_zip_input}".strip()

            st.session_state["ee10_record"] = record
            st.session_state["ee10_claimant"] = name_input
            st.session_state["ee10_case_id"] = case_id_input
            st.session_state["ee10_doctor"] = doctor_selection
            st.session_state["ee10_phone"] = phone_input
            st.session_state["ee10_address"] = full_address.strip()
            st.session_state["ee10_generated"] = True

        except Exception as e:
            st.error(f"❌ Error generating EE-10: {e}")

    # Portal access section
    if st.session_state.get("ee10_generated"):
        st.divider()
        st.subheader("🌐 Portal Access")

        if os.getenv("PLAYWRIGHT_ENABLED", "false").lower() == "true":
            col1, col2, col3 = st.columns([1, 2, 1])
            with col2:
                if st.button(
                    "🌐 Access DOL Portal",
                    type="secondary",
                    use_container_width=True,
                    help="Launch automated portal access to upload the generated form",
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
            st.warning(
                "⚠️ Portal automation is only available in local environments with Playwright enabled."
            )

        # Email drafting section
        st.divider()
        st.subheader("📧 Draft IR Request Email")

        # Get client record and detect status
        record = st.session_state.get("ee10_record")
        client_status = detect_client_status(record) if record else ""
        doctor_selection = st.session_state.get("ee10_doctor", "")

        # Show client status if detected
        if client_status:
            if client_status == "AO Client":
                st.info(f"🏷️ Detected client status: **{client_status}**")
            elif client_status == "GHHC Client":
                st.info(
                    f"🏷️ Detected client status: **{client_status}** - HHC location selection required"
                )
        else:
            st.warning("⚠️ Client status not detected - email routing may be limited")

        # Show auto-populated client info from EE-10
        st.markdown("**📋 Client Information (from EE-10 form)**")
        client_name = st.session_state.get("ee10_claimant", "")
        case_id = st.session_state.get("ee10_case_id", "")
        phone = st.session_state.get("ee10_phone", "")
        address = st.session_state.get("ee10_address", "")


        col1, col2 = st.columns(2)
        with col1:
            st.text_input("Name", value=client_name, disabled=True)
            st.text_input("Case ID", value=case_id, disabled=True)
        with col2:
            st.text_input("Phone", value=phone, disabled=True)
            st.text_area("Address", value=address, disabled=True, height=80)

        # Additional fields needed for email
        st.markdown("**📝 Additional Information Required**")
        col1, col2 = st.columns(2)

        with col1:
            email_dob = st.text_input(
                "Date of Birth *",
                placeholder="MM/DD/YYYY",
                help="Client's date of birth for the email",
                key="email_dob",
            )

        with col2:
            # HHC location selection for GHHC clients
            hhc_location = ""
            if is_hhc_client(client_status):
                hhc_location = st.selectbox(
                    "GHHC Location *",
                    ["", "NV", "TN"],
                    help="Select the GHHC location for proper email routing",
                )

            # Work history field for Dr. Lewis only
            work_history_dates = ""
            if doctor_selection == "Dr. Lewis":
                work_history_dates = st.text_input(
                    "Verified Work History Dates *",
                    placeholder="MM/YYYY-MM/YYYY",
                    help="Verified employment date ranges for Dr. Lewis evaluation",
                    key="work_history_dates",
                )

        # Validation and email button
        email_errors = []

        if not email_dob:
            email_errors.append("Date of birth is required")
        if doctor_selection == "Dr. Lewis" and not work_history_dates:
            email_errors.append("Work history dates are required for Dr. Lewis")
        if is_hhc_client(client_status) and not hhc_location:
            email_errors.append("GHHC location selection is required")

        # Show validation errors
        if email_errors:
            for error in email_errors:
                st.error(f"❌ {error}")

        # Email draft button
        col1, col2, col3 = st.columns([1, 2, 1])
        with col2:
            email_button_disabled = len(email_errors) > 0
            if st.button(
                "📧 Draft IR Request Email",
                type="primary",
                use_container_width=True,
                disabled=email_button_disabled,
                help=(
                    "Create a pre-drafted email with client information"
                    if not email_button_disabled
                    else "Complete all required fields to enable email drafting"
                ),
            ):
                try:
                    # Get client information from stored session state
                    client_name = st.session_state.get("ee10_claimant", "")
                    case_id = st.session_state.get("ee10_case_id", "")
                    phone = st.session_state.get("ee10_phone", "")
                    address = st.session_state.get("ee10_address", "")

                    # Format email body
                    email_body = format_ir_email(
                        doctor_selection=doctor_selection,
                        name=client_name,
                        phone=phone,
                        dob=email_dob,
                        case_id=case_id,
                        address=address,
                        work_history_dates=work_history_dates,
                    )

                    # Get subject line
                    subject = get_subject_line(client_name)

                    # Get email recipients
                    to_recipients, cc_recipients = get_email_recipients(
                        doctor_selection, client_status, hhc_location
                    )

                    # Create email service and draft email
                    email_service = EmailService()

                    success = email_service.create_email_draft(
                        to_recipients=to_recipients,
                        cc_recipients=cc_recipients,
                        subject=subject,
                        body=email_body,
                    )

                    if success:
                        st.success("📧 Email draft created successfully!")
                        st.info("✅ Outlook draft opened - review and add attachments before sending")
                        if os.name != 'nt':  # Not Windows
                            st.warning("⚠️ Note: On macOS, you may need to manually add line breaks in the email body")

                        # Show email details for confirmation
                        with st.expander("📋 Email Details", expanded=False):
                            st.write(f"**TO:** {', '.join(to_recipients)}")
                            st.write(f"**CC:** {', '.join(cc_recipients)}")
                            st.write(f"**Subject:** {subject}")
                            st.write("**Body:**")
                            st.text(email_body)
                    else:
                        st.error("❌ Failed to create email draft")

                except Exception as e:
                    st.error(f"❌ Error creating email draft: {e}")
