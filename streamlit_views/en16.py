import streamlit as st
from dol_portal.en_16_uploader import upload_en16_to_portal
from generators.en16_generator import EN16Generator
from services.airtable import fetch_clients


def render_en16():
    if "en16_pdf_path" not in st.session_state:
        st.session_state["en16_pdf_path"] = None
    st.header("Generate EN-16 Form")

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

    claimant = st.text_input(
        "Claimant Name", value=st.session_state.get("prefill_claimant", "")
    )
    case_id = st.text_input(
        "Case ID", value=st.session_state.get("prefill_case_id", "")
    )

    if st.button("Generate EN-16"):
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

        # You might want to use claimant/case_id variables here for further processing
        try:
            generator = EN16Generator()
            filename, pdf_bytes = generator.generate(claimant, case_id)
            st.session_state.en16_pdf_name = filename
            st.session_state.en16_pdf_bytes = pdf_bytes.read()
            st.success("EN-16 generated successfully!")
            st.session_state.en16_generated = True
            st.session_state["en16_claimant"] = claimant
            st.session_state["en16_case_id"] = case_id
            st.session_state["en16_record"] = record
        except Exception as e:
            st.error(f"Error generating EN-16: {e}")

    # Show buttons after generation
    if st.session_state.get("en16_pdf_bytes"):
        col1, col2 = st.columns([1, 1])
        with col1:
            st.download_button(
                label=f"Download {st.session_state.en16_pdf_name}",
                data=st.session_state.en16_pdf_bytes,
                file_name=st.session_state.en16_pdf_name,
                mime="application/pdf",
            )
        with col2:
            if st.button("Access Portal"):
                with st.status("🔁 Launching portal automation...", expanded=True):
                    try:
                        upload_en16_to_portal(
                            st.session_state["en16_record"],
                            st.session_state["en16_case_id"],
                            st.session_state["en16_claimant"],
                        )
                        st.success("✅ Upload script completed.")
                    except Exception as e:
                        st.error(f"❌ Upload script failed: {e}")
