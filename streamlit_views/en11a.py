import streamlit as st
from services.airtable import fetch_clients
from generators.en11a_generator import EN11AGenerator


def render_en11a():
    st.header("Generate EN-11A Form")

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

    doctor_selection = st.selectbox("Select a Doctor", ["Dr. Kalcich", "Dr. Lewis"])

    if st.button("Generate EN-11A"):
        if client_selection == "Select...":
            st.error("Please select a valid client.")
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

        try:
            generator = EN11AGenerator()
            filename, pdf_bytes = generator.generate(record, doctor_selection)

            st.download_button(
                label=f"Download {filename}",
                data=pdf_bytes.read(),
                file_name=filename,
                mime="application/pdf",
            )
            st.success("EN-11A generated successfully!")
        except Exception as e:
            st.error(f"Error generating EN-11A: {e}")
