import streamlit as st
from datetime import date, timedelta
from services.airtable import fetch_clients
from generators.ir_notice_la_plata_generator import LaPlataNoticeGenerator


def render_ir_notice_la_plata():
    st.header("La Plata IR Schedule Notice")

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

    client_name = st.text_input(
        "Client Name", value=st.session_state.get("prefill_client_name", "")
    )
    case_id = st.text_input(
        "Case ID", value=st.session_state.get("prefill_case_id", "")
    )
    appointment_date = st.date_input(
        "Appointment Date", value=date.today() + timedelta(days=75)
    )

    if st.button("Generate Notice"):
        if selected_client == "Select...":
            st.error("Please select a valid client.")
            return

        if not client_name or not case_id:
            st.error("Please fill out all fields.")
            return

        try:
            generator = LaPlataNoticeGenerator()
            formatted_date = appointment_date.strftime("%m/%d/%Y")
            filename, pdf_bytes = generator.generate(
                client_name, case_id, formatted_date
            )

            st.download_button(
                label=f"Download {filename}",
                data=pdf_bytes,
                file_name=filename,
                mime="application/pdf",
            )
            st.success("Notice generated successfully!")
        except Exception as e:
            st.error(f"Error generating notice: {e}")
