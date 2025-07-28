import os
import streamlit as st
from datetime import datetime
from services.airtable import fetch_clients
from generators.rd_waiver_generator import RDAcceptWaiverGenerator
from dol_portal.access_case_portal import access_case_portal

# If you have a fetch_invoices function, import it here
# from services.airtable import fetch_invoices


def render_rd_waiver():
    st.header("Generate RD Accept Waiver")

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
    selected_client = st.selectbox("Select a Client", ["Select..."] + client_names)

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

    claimant = st.text_input(
        "Claimant Name", value=st.session_state.get("prefill_claimant", "")
    )
    employee = st.text_input(
        "Employee Name", value=st.session_state.get("prefill_employee", "")
    )
    case_id = st.text_input(
        "Case ID", value=st.session_state.get("prefill_case_id", "")
    )
    rd_decision_date = st.date_input("RD Decision Date", value=datetime.today())

    if st.button("Generate RD Accept Waiver"):
        if selected_client == "Select...":
            st.error("Please select a valid client.")
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

        if not claimant and not employee and not case_id:
            st.warning("Consider pre-filling using the selected client.")
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
            st.success("RD Accept Waiver generated successfully!")
            st.session_state["rdwaiver_pdf_name"] = filename
            st.session_state["rdwaiver_pdf_bytes"] = pdf_bytes.read()
            st.session_state["rdwaiver_record"] = selected_record
            st.session_state["rdwaiver_claimant"] = claimant
            st.session_state["rdwaiver_case_id"] = case_id
        except Exception as e:
            st.error(f"Error generating waiver: {e}")

    # Show buttons after generation
    if st.session_state.get("rdwaiver_pdf_bytes"):
        col1, col2 = st.columns([1, 1])
        with col1:
            st.download_button(
                label=f"Download {st.session_state.rdwaiver_pdf_name}",
                data=st.session_state.rdwaiver_pdf_bytes,
                file_name=st.session_state.rdwaiver_pdf_name,
                mime="application/pdf",
            )
        with col2:
            if os.getenv("PLAYWRIGHT_ENABLED", "false").lower() == "true":
                if st.button("Access Portal"):
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
                            st.success("✅ Upload script completed.")
                        except Exception as e:
                            st.error(f"❌ Upload script failed: {e}")
            else:
                st.caption(
                    "⚠️ Portal automation is only available in local environments."
                )
