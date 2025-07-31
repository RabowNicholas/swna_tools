import streamlit as st
from services.airtable import fetch_clients
from dol_portal.access_case_portal import access_case_portal
import os


def render_portal_access():
    st.header("Access Portal")

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
    client_selection = st.selectbox("Select a Client", ["Select..."] + client_names)

    # Get client data when selected
    selected_record = None
    if client_selection != "Select...":
        selected_record = next(
            (
                rec
                for rec in st.session_state.client_records
                if rec["fields"].get("Name") == client_selection
            ),
            None,
        )

    if os.getenv("PLAYWRIGHT_ENABLED", "false").lower() == "true":
        if st.button("Access Portal"):
            if client_selection == "Select...":
                st.error("Please select a valid client.")
                return

            if not selected_record:
                st.error("Client record not found.")
                return

            with st.status("🔁 Launching portal automation...", expanded=True):
                try:
                    fields = selected_record["fields"]
                    raw_name = fields.get("Name", "")
                    case_id = fields.get("Case ID", "")
                    
                    # Parse SSN last 4 digits from name field
                    ssn_last4 = raw_name.split("-")[-1].strip()
                    
                    # Parse last name from name field
                    try:
                        last, rest = raw_name.split(",", 1)
                        last_name = last.strip()
                    except ValueError:
                        last_name = raw_name.split()[-1]

                    access_case_portal(
                        selected_record,
                        case_id,
                        last_name,
                        ssn_last4,
                    )
                    st.success("✅ Portal automation completed.")
                except Exception as e:
                    st.error(f"❌ Portal automation failed: {e}")
    else:
        st.caption("⚠️ Portal automation is only available in local environments.")