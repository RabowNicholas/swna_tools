import os
import streamlit as st
from datetime import datetime
from services.airtable import fetch_clients
from generators.rd_waiver_generator import RDAcceptWaiverGenerator
from dol_portal.access_case_portal import access_case_portal

# If you have a fetch_invoices function, import it here
# from services.airtable import fetch_invoices


def render_rd_waiver():
    st.title("📝 RD Accept Waiver Generator")
    st.markdown("**Generate Waiver for Recommended Decision (RD) Acceptance**")
    st.info("📝 **For Staff Use:** Complete this form on behalf of your client to generate their RD acceptance waiver.")
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
        "Choose which client you're preparing this waiver for", 
        ["Select..."] + client_names,
        help="Select an existing client record to auto-populate their basic information"
    )
    
    if selected_client != "Select...":
        st.success(f"✅ Selected: {selected_client}")

    # Prefill fields when client changes
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
            # Clear address and invoice-related fields
            st.session_state["invoice_data"] = None
            st.session_state["address_line_1"] = ""
            st.session_state["address_line_2"] = ""
            st.session_state["city"] = ""
            st.session_state["state"] = ""
            st.session_state["zip_code"] = ""

            # Optional: refetch invoices if you have a fetch_invoices(record_id) function
            # from services.airtable import fetch_invoices
            # st.session_state["invoice_data"] = fetch_invoices(record["id"])

            fields = record["fields"]
            raw_name = fields.get("Name", "")
            try:
                last, rest = raw_name.split(",", 1)
                first = rest.split("-")[0].strip()
                full_name = f"{first} {last.strip()}"
            except ValueError:
                full_name = raw_name

            st.session_state["prefill_claimant"] = full_name
            st.session_state["prefill_employee"] = full_name
            st.session_state["prefill_case_id"] = fields.get("Case ID", "")
        else:
            st.session_state["prefill_claimant"] = ""
            st.session_state["prefill_employee"] = ""
            st.session_state["prefill_case_id"] = ""
    else:
        st.session_state["prefill_claimant"] = ""
        st.session_state["prefill_employee"] = ""
        st.session_state["prefill_case_id"] = ""

    st.divider()
    st.subheader("👤 Client Information")
    st.caption("Enter the client's information as it appears in their records")
    
    col1, col2 = st.columns(2, gap="medium")
    
    with col1:
        st.markdown("**👤 Personal Details**")
        claimant = st.text_input(
            "Claimant Name *", 
            value=st.session_state.get("prefill_claimant", ""),
            help="Full name of the claimant as it appears on official documents"
        )
        employee = st.text_input(
            "Employee Name *", 
            value=st.session_state.get("prefill_employee", ""),
            help="Employee name (typically same as claimant unless different)"
        )
    
    with col2:
        st.markdown("**📋 Case & Decision Information**")
        case_id = st.text_input(
            "Case ID *", 
            value=st.session_state.get("prefill_case_id", ""),
            help="The case identification number assigned to this client"
        )
        rd_decision_date = st.date_input(
            "RD Decision Date *", 
            value=datetime.today(),
            help="Date when the Recommended Decision was issued"
        )

    st.divider()
    
    # Generate button with better styling
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        generate_button = st.button(
            "🚀 Generate Client's RD Accept Waiver",
            type="primary",
            use_container_width=True,
            help="Click to generate the completed RD acceptance waiver PDF for this client"
        )
    
    if generate_button:
        # Validation
        errors = []
        if selected_client == "Select...":
            errors.append("Please select a valid client.")
        if not claimant:
            errors.append("Claimant name is required.")
        if not employee:
            errors.append("Employee name is required.")
        if not case_id:
            errors.append("Case ID is required.")
        if not rd_decision_date:
            errors.append("RD Decision Date is required.")
        
        if errors:
            for error in errors:
                st.error(error)
            return

        selected_record = next(
            (
                rec
                for rec in st.session_state.client_records
                if rec["fields"].get("Name") == selected_client
            ),
            None,
        )

        if not selected_record:
            st.error("Client record not found.")
            return


        try:
            generator = RDAcceptWaiverGenerator()
            filename, pdf_bytes = generator.generate(
                claimant=claimant,
                employee=employee,
                case_id=case_id,
                rd_decision_date=rd_decision_date.strftime("%m/%d/%Y"),
                current_date=datetime.now().strftime("%m/%d/%Y"),
            )
            st.success("🎉 RD Accept Waiver generated successfully for client!")
            st.balloons()  # Celebrate successful form generation!
            st.session_state["rdwaiver_pdf_name"] = filename
            st.session_state["rdwaiver_pdf_bytes"] = pdf_bytes.read()
            st.session_state["rdwaiver_record"] = selected_record
            st.session_state["rdwaiver_claimant"] = claimant
            st.session_state["rdwaiver_case_id"] = case_id
        except Exception as e:
            st.error(f"❌ Error generating RD Accept Waiver: {e}")

    # Show download and portal access after generation
    if st.session_state.get("rdwaiver_pdf_bytes"):
        st.divider()
        st.subheader("📥 Download Form")
        
        col1, col2, col3 = st.columns([1, 2, 1])
        with col2:
            st.download_button(
                label=f"📥 Download {st.session_state.rdwaiver_pdf_name}",
                data=st.session_state.rdwaiver_pdf_bytes,
                file_name=st.session_state.rdwaiver_pdf_name,
                mime="application/pdf",
                type="primary",
                use_container_width=True
            )
        
        # Portal access section
        st.divider()
        st.subheader("🌐 Portal Access")
        st.info("💡 **Staff Note:** After downloading the waiver, you can access the DOL portal to upload it directly.")
        
        if os.getenv("PLAYWRIGHT_ENABLED", "false").lower() == "true":
            col1, col2, col3 = st.columns([1, 2, 1])
            with col2:
                if st.button(
                    "🌐 Access DOL Portal", 
                    type="secondary",
                    use_container_width=True,
                    help="Launch automated portal access to upload the generated waiver"
                ):
                    with st.status("🔁 Launching portal automation...", expanded=True):
                        try:
                            record = st.session_state["rdwaiver_record"]
                            ssn_last4 = record["fields"]["Name"].split("-")[-1].strip()
                            last_name = st.session_state["rdwaiver_claimant"].split()[
                                -1
                            ]
                            access_case_portal(
                                record,
                                st.session_state["rdwaiver_case_id"],
                                last_name,
                                ssn_last4,
                            )
                            st.success("✅ Portal automation completed successfully!")
                        except Exception as e:
                            st.error(f"❌ Portal automation failed: {e}")
        else:
            st.warning("⚠️ Portal automation is only available in local environments with Playwright enabled.")
