import streamlit as st
from services.airtable import fetch_clients, update_client_data
from utils.state_mapping import get_state_abbreviation
from datetime import datetime, date


def render_client_data_manager():
    st.title("👤 Client Data Manager")
    st.markdown("**Efficiently manage client information without using the Airtable interface**")
    st.divider()

    # Load clients
    if "client_records" not in st.session_state:
        with st.spinner("Loading clients..."):
            try:
                st.session_state.client_records = fetch_clients()
            except Exception as e:
                st.error(f"Failed to load clients: {e}")
                return

    # Client selection
    client_names = [
        rec["fields"].get("Name", f"Unnamed {i}")
        for i, rec in enumerate(st.session_state.client_records)
    ]
    
    st.subheader("👤 Select Client")
    client_selection = st.selectbox(
        "Choose client to manage data", 
        ["Select..."] + client_names,
        help="Select the client whose information you want to manage"
    )
    
    if client_selection == "Select...":
        st.info("👆 Please select a client to manage their information")
        return
    
    # Get selected client record
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
    
    st.success(f"✅ Managing data for: **{client_selection}**")
    
    # Show current data if it exists
    fields = record["fields"]
    current_street = fields.get("Street Address", "")
    current_city = fields.get("City", "")
    current_state = fields.get("State", "")
    current_zip = fields.get("ZIP Code", "")
    current_phone = fields.get("Phone", "")
    current_email = fields.get("Email", "")
    current_dob = fields.get("Date of Birth", "")
    current_ssn = fields.get("Social Security Number", "")
    
    # Display current information in organized sections
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("📋 Current Personal Information")
        with st.container():
            if current_dob:
                st.text(f"Date of Birth: {current_dob}")
            else:
                st.text("Date of Birth: Not set")
            
            if current_phone:
                st.text(f"Phone: {current_phone}")
            else:
                st.text("Phone: Not set")
            
            if current_email:
                st.text(f"Email: {current_email}")
            else:
                st.text("Email: Not set")
            
            if current_ssn:
                st.text(f"SSN: {current_ssn}")
            else:
                st.text("SSN: Not set")
    
    with col2:
        st.subheader("📍 Current Address")
        with st.container():
            if any([current_street, current_city, current_state, current_zip]):
                if current_street:
                    st.text(f"Street: {current_street}")
                if current_city:
                    st.text(f"City: {current_city}")
                if current_state:
                    st.text(f"State: {current_state}")
                if current_zip:
                    st.text(f"ZIP: {current_zip}")
            else:
                st.text("No address set")
    
    # Clear all data option
    if any([current_street, current_city, current_state, current_zip, current_phone, current_email, current_dob, current_ssn]):
        if st.button("🗑️ Clear All Data", help="Clear all manageable client data"):
            if st.session_state.get("confirm_clear_all", False):
                try:
                    update_data = {
                        "Street Address": "",
                        "City": "",
                        "State": "",
                        "ZIP Code": "",
                        "Phone": "",
                        "Email": "",
                        "Date of Birth": "",
                        "Social Security Number": ""
                    }
                    update_client_data(record["id"], update_data)
                    st.success("✅ All data cleared successfully!")
                    st.rerun()
                except Exception as e:
                    st.error(f"Error clearing data: {e}")
            else:
                st.session_state.confirm_clear_all = True
                st.warning("Click again to confirm clearing ALL client data")
    
    st.divider()
    st.subheader("✏️ Update Client Information")
    
    # Tabbed interface for different data types
    tab1, tab2 = st.tabs(["📍 Address Information", "👤 Personal Information"])
    
    with tab1:
        st.markdown("**Update client's address information**")
        
        with st.form("address_form"):
            street_input = st.text_input(
                "Street Address *",
                value=current_street,
                placeholder="123 Main Street, Apt 4B",
                help="Full street address including apartment/unit number"
            )
            
            col1, col2, col3 = st.columns([2, 1, 1])
            
            with col1:
                city_input = st.text_input(
                    "City *",
                    value=current_city,
                    placeholder="Las Vegas",
                    help="City name"
                )
            
            with col2:
                # State dropdown for easier selection
                state_options = [
                    "", "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
                    "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
                    "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
                    "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
                    "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
                    "New Hampshire", "New Jersey", "New Mexico", "New York",
                    "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
                    "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
                    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
                    "West Virginia", "Wisconsin", "Wyoming", "District of Columbia"
                ]
                
                # Try to match current state
                current_state_match = current_state
                if current_state and len(current_state) == 2:
                    # If it's an abbreviation, try to find the full name
                    for state_name in state_options:
                        if get_state_abbreviation(state_name) == current_state.upper():
                            current_state_match = state_name
                            break
                
                state_input = st.selectbox(
                    "State *",
                    state_options,
                    index=state_options.index(current_state_match) if current_state_match in state_options else 0,
                    help="Select state from dropdown"
                )
            
            with col3:
                zip_input = st.text_input(
                    "ZIP Code *",
                    value=current_zip,
                    placeholder="89101",
                    help="5-digit ZIP code",
                    max_chars=5
                )
            
            # Buttons
            col1, col2, col3 = st.columns([1, 1, 1])
            
            with col1:
                save_address_button = st.form_submit_button(
                    "💾 Save Address",
                    type="primary",
                    use_container_width=True
                )
            
            with col2:
                prefill_address_button = st.form_submit_button(
                    "📋 Use Current",
                    help="Prefill form with current address",
                    use_container_width=True
                )
            
            with col3:
                clear_address_button = st.form_submit_button(
                    "🧹 Clear Address",
                    help="Clear only address fields",
                    use_container_width=True
                )
        
        # Handle address form submissions
        if save_address_button:
            # Validation
            errors = []
            if not street_input.strip():
                errors.append("Street address is required")
            if not city_input.strip():
                errors.append("City is required")
            if not state_input:
                errors.append("State is required")
            if not zip_input.strip():
                errors.append("ZIP code is required")
            elif not zip_input.isdigit() or len(zip_input) != 5:
                errors.append("ZIP code must be exactly 5 digits")
            
            if errors:
                for error in errors:
                    st.error(error)
            else:
                try:
                    # Update address in Airtable
                    update_data = {
                        "Street Address": street_input.strip(),
                        "City": city_input.strip(),
                        "State": state_input,  # Store full state name
                        "ZIP Code": zip_input.strip()
                    }
                    
                    update_client_data(record["id"], update_data)
                    st.success("✅ Address updated successfully!")
                    
                    # Refresh client records
                    st.session_state.client_records = fetch_clients()
                    st.rerun()
                    
                except Exception as e:
                    st.error(f"Error updating address: {e}")
        
        if clear_address_button:
            try:
                update_data = {
                    "Street Address": "",
                    "City": "",
                    "State": "",
                    "ZIP Code": ""
                }
                update_client_data(record["id"], update_data)
                st.success("✅ Address cleared successfully!")
                st.session_state.client_records = fetch_clients()
                st.rerun()
            except Exception as e:
                st.error(f"Error clearing address: {e}")
    
    with tab2:
        st.markdown("**Update client's personal information**")
        
        with st.form("personal_form"):
            # Date of Birth
            dob_input = None
            if current_dob:
                try:
                    # Try to parse existing DOB - handle various formats
                    if isinstance(current_dob, str):
                        # Try common date formats
                        for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%m-%d-%Y", "%Y/%m/%d"]:
                            try:
                                dob_input = datetime.strptime(current_dob, fmt).date()
                                break
                            except ValueError:
                                continue
                except:
                    dob_input = None
            
            dob_updated = st.date_input(
                "Date of Birth",
                value=dob_input,
                min_value=date(1900, 1, 1),
                max_value=datetime.now().date(),
                help="Client's date of birth"
            )
            
            # Phone number
            phone_input = st.text_input(
                "Phone Number",
                value=current_phone,
                placeholder="555.123.4567",
                help="Client's primary phone number"
            )
            
            # Email address
            email_input = st.text_input(
                "Email Address",
                value=current_email,
                placeholder="client@example.com",
                help="Client's email address"
            )
            
            # Social Security Number
            ssn_input = st.text_input(
                "Social Security Number",
                value=current_ssn,
                placeholder="123456789",
                help="Client's Social Security Number (9 digits, no dashes)",
                max_chars=9
            )
            
            # Buttons
            col1, col2, col3 = st.columns([1, 1, 1])
            
            with col1:
                save_personal_button = st.form_submit_button(
                    "💾 Save Personal Info",
                    type="primary",
                    use_container_width=True
                )
            
            with col2:
                prefill_personal_button = st.form_submit_button(
                    "📋 Use Current",
                    help="Prefill form with current personal info",
                    use_container_width=True
                )
            
            with col3:
                clear_personal_button = st.form_submit_button(
                    "🧹 Clear Personal Info",
                    help="Clear only personal information fields",
                    use_container_width=True
                )
        
        # Handle personal form submissions
        if save_personal_button:
            # Validate email format if provided
            email_error = False
            if email_input.strip():
                import re
                email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                if not re.match(email_pattern, email_input.strip()):
                    st.error("Please enter a valid email address")
                    email_error = True
            
            # Validate SSN format if provided
            ssn_error = False
            if ssn_input.strip():
                ssn_digits = ''.join(filter(str.isdigit, ssn_input.strip()))
                if len(ssn_digits) != 9:
                    st.error("Social Security Number must be exactly 9 digits")
                    ssn_error = True
            
            if not email_error and not ssn_error:
                try:
                    # Prepare update data
                    update_data = {}
                    
                    if dob_updated:
                        # Format date as string for Airtable
                        update_data["Date of Birth"] = dob_updated.strftime("%Y-%m-%d")
                    
                    if phone_input.strip():
                        update_data["Phone"] = phone_input.strip()
                    elif phone_input == "":  # Explicitly clear phone if empty
                        update_data["Phone"] = ""
                    
                    if email_input.strip():
                        update_data["Email"] = email_input.strip()
                    elif email_input == "":  # Explicitly clear email if empty
                        update_data["Email"] = ""
                    
                    if ssn_input.strip():
                        # Store only digits in Airtable 
                        ssn_digits = ''.join(filter(str.isdigit, ssn_input.strip()))
                        update_data["Social Security Number"] = ssn_digits
                    elif ssn_input == "":  # Explicitly clear SSN if empty
                        update_data["Social Security Number"] = ""
                
                    if update_data:
                        update_client_data(record["id"], update_data)
                        st.success("✅ Personal information updated successfully!")
                        
                        # Refresh client records
                        st.session_state.client_records = fetch_clients()
                        st.rerun()
                    else:
                        st.warning("No changes to save")
                        
                except Exception as e:
                    st.error(f"Error updating personal information: {e}")
        
        if clear_personal_button:
            try:
                update_data = {
                    "Date of Birth": "",
                    "Phone": "",
                    "Email": "",
                    "Social Security Number": ""
                }
                update_client_data(record["id"], update_data)
                st.success("✅ Personal information cleared successfully!")
                st.session_state.client_records = fetch_clients()
                st.rerun()
            except Exception as e:
                st.error(f"Error clearing personal information: {e}")
    
    # Reset confirmation state
    if "confirm_clear_all" in st.session_state and not any([save_address_button, save_personal_button]):
        del st.session_state.confirm_clear_all
    
    st.divider()
    
    # Quick tips
    with st.expander("💡 Quick Tips"):
        st.markdown("""
        **Efficient Client Data Management:**
        
        **Address Information:**
        - Use the dropdown for state selection to ensure consistency
        - ZIP codes are automatically validated for 5 digits
        - State names stored as full names, converted to abbreviations in forms
        
        **Personal Information:**
        - Date of Birth is validated to be realistic (1900 to present)
        - Phone numbers can be in any format
        - Email addresses are validated for proper format
        - All changes are saved immediately to Airtable
        
        **General:**
        - Updated information appears in all forms automatically
        - Use tabs to organize different types of data updates
        - Clear individual sections or all data as needed
        """)