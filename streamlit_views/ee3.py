import streamlit as st
from services.airtable import fetch_clients
from generators.ee3_generator import EE3Generator
import re
import os
from dol_portal.access_case_portal import access_case_portal
from datetime import datetime


def render_ee3():
    st.header("Generate EE-3 Form")

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
                st.session_state["prefill_first_name"] = first
                st.session_state["prefill_last_name"] = last.strip()
            except ValueError:
                # If parsing fails, leave fields empty for manual entry
                st.session_state["prefill_first_name"] = ""
                st.session_state["prefill_last_name"] = ""
        else:
            st.session_state["prefill_first_name"] = ""
            st.session_state["prefill_last_name"] = ""
    else:
        st.session_state["prefill_first_name"] = ""
        st.session_state["prefill_last_name"] = ""

    # Basic Information
    st.subheader("Personal Information")
    
    col1, col2 = st.columns(2)
    with col1:
        first_name_input = st.text_input("First Name", value=st.session_state.get("prefill_first_name", ""))
        last_name_input = st.text_input("Last Name", value=st.session_state.get("prefill_last_name", ""))
        ssn_input = st.text_input("Social Security Number", placeholder="XXX-XX-XXXX")
    
    with col2:
        former_name_input = st.text_input("Former Name (if any)", placeholder="Leave blank if none")

    # Employment History Section
    st.subheader("Employment History")
    st.caption("Add all relevant employment positions:")
    
    # Initialize employment history in session state if not exists
    if "employment_history_ee3" not in st.session_state:
        st.session_state.employment_history_ee3 = [{
            "start_date": None,
            "end_date": None,
            "facility_name": "",
            "specific_location": "",
            "city": "",
            "state": "",
            "contractor": "",
            "position_title": "",
            "work_duties": "",
            "union_member": False
        }]
    
    employment_history = st.session_state.employment_history_ee3
    
    # Display current employment entries
    for i, job in enumerate(employment_history):
        with st.expander(f"Employment #{i+1}", expanded=True):
            col1, col2 = st.columns(2)
            
            with col1:
                employment_history[i]["start_date"] = st.date_input(
                    "Start Date", 
                    value=job["start_date"], 
                    key=f"start_date_{i}"
                )
                employment_history[i]["facility_name"] = st.text_input(
                    "Facility Name", 
                    value=job["facility_name"], 
                    key=f"facility_{i}"
                )
                employment_history[i]["city"] = st.text_input(
                    "City", 
                    value=job["city"], 
                    key=f"city_{i}"
                )
                employment_history[i]["contractor"] = st.text_input(
                    "Contractor", 
                    value=job["contractor"], 
                    key=f"contractor_{i}"
                )
                employment_history[i]["work_duties"] = st.text_area(
                    "Work Duties Description", 
                    value=job["work_duties"], 
                    key=f"duties_{i}",
                    height=100
                )
            
            with col2:
                employment_history[i]["end_date"] = st.date_input(
                    "End Date", 
                    value=job["end_date"], 
                    key=f"end_date_{i}"
                )
                employment_history[i]["specific_location"] = st.text_input(
                    "Specific Location", 
                    value=job["specific_location"], 
                    key=f"location_{i}"
                )
                employment_history[i]["state"] = st.text_input(
                    "State", 
                    value=job["state"], 
                    key=f"state_{i}",
                    max_chars=2
                )
                employment_history[i]["position_title"] = st.text_input(
                    "Position Title", 
                    value=job["position_title"], 
                    key=f"position_{i}"
                )
                employment_history[i]["union_member"] = st.checkbox(
                    "Union Member", 
                    value=job["union_member"], 
                    key=f"union_{i}"
                )
            
            # Remove button (only show if more than one job)
            if len(employment_history) > 1:
                if st.button(f"Remove Employment #{i+1}", key=f"remove_job_{i}"):
                    employment_history.pop(i)
                    st.rerun()
    
    # Add/Remove employment buttons
    col1, col2 = st.columns(2)
    with col1:
        if st.button("Add Employment"):
            st.session_state.employment_history_ee3.append({
                "start_date": None,
                "end_date": None,
                "facility_name": "",
                "specific_location": "",
                "city": "",
                "state": "",
                "contractor": "",
                "position_title": "",
                "work_duties": "",
                "union_member": False
            })
            st.rerun()

    if st.button("Generate EE-3"):
        # Validation
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

        # Required field validation
        errors = []
        if not first_name_input:
            errors.append("First name is required.")
        if not last_name_input:
            errors.append("Last name is required.")
        if not ssn_input:
            errors.append("Social Security Number is required.")
        
        # Validate SSN format
        if ssn_input and not re.match(r'^\d{3}-\d{2}-\d{4}$', ssn_input):
            errors.append("Social Security Number must be in format XXX-XX-XXXX.")
        
        # Validate employment history
        valid_jobs = []
        for i, job in enumerate(employment_history):
            job_errors = []
            if not job["start_date"]:
                job_errors.append(f"Employment #{i+1}: Start date is required.")
            if not job["facility_name"]:
                job_errors.append(f"Employment #{i+1}: Facility name is required.")
            if not job["city"]:
                job_errors.append(f"Employment #{i+1}: City is required.")
            if not job["state"]:
                job_errors.append(f"Employment #{i+1}: State is required.")
            if not job["position_title"]:
                job_errors.append(f"Employment #{i+1}: Position title is required.")
            
            # Date validation
            if job["start_date"] and job["end_date"]:
                if job["start_date"] >= job["end_date"]:
                    job_errors.append(f"Employment #{i+1}: End date must be after start date.")
            
            if job["start_date"] and job["start_date"] > datetime.now().date():
                job_errors.append(f"Employment #{i+1}: Start date cannot be in the future.")
            
            if job["end_date"] and job["end_date"] > datetime.now().date():
                job_errors.append(f"Employment #{i+1}: End date cannot be in the future.")
            
            errors.extend(job_errors)
            
            # Only add valid jobs
            if not job_errors and job["facility_name"]:  # Basic validity check
                valid_jobs.append(job)
        
        if not valid_jobs:
            errors.append("At least one complete employment record is required.")

        if errors:
            for error in errors:
                st.error(error)
            return

        form_data = {
            "first_name": first_name_input,
            "last_name": last_name_input,
            "former_name": former_name_input,
            "ssn": ssn_input,
            "employment_history": valid_jobs,
        }

        try:
            generator = EE3Generator()
            filename, pdf_bytes = generator.generate(record, form_data)

            st.download_button(
                label=f"Download {filename}",
                data=pdf_bytes.read(),
                file_name=filename,
                mime="application/pdf",
            )
            st.success("EE-3 generated successfully!")

            st.session_state["ee3_record"] = record
            st.session_state["ee3_claimant"] = f"{last_name_input}, {first_name_input}"
            st.session_state["ee3_case_id"] = record["fields"].get("Case ID", "")
            st.session_state["ee3_generated"] = True

        except Exception as e:
            st.error(f"Error generating EE-3: {e}")

    if st.session_state.get("ee3_generated"):
        if os.getenv("PLAYWRIGHT_ENABLED", "false").lower() == "true":
            if st.button("Access Portal"):
                with st.status("🔁 Launching portal automation...", expanded=True):
                    try:
                        record = st.session_state["ee3_record"]
                        ssn_last4 = record["fields"]["Name"].split("-")[-1].strip()
                        last_name = st.session_state["ee3_claimant"].split(",")[0].strip()
                        access_case_portal(
                            record,
                            st.session_state["ee3_case_id"],
                            last_name,
                            ssn_last4,
                        )
                        st.success("✅ Upload script completed.")
                    except Exception as e:
                        st.error(f"❌ Upload script failed: {e}")
        else:
            st.caption("⚠️ Portal automation is only available in local environments.")