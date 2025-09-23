import streamlit as st
from services.airtable import fetch_clients, update_client_address
from utils.state_mapping import get_state_abbreviation


def render_address_manager():
    st.title("📍 Client Address Manager")
    st.markdown("**Quickly add or update client addresses without using Airtable interface**")
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
        "Choose client to add/update address", 
        ["Select..."] + client_names,
        help="Select the client whose address you want to manage"
    )
    
    if client_selection == "Select...":
        st.info("👆 Please select a client to manage their address")
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
    
    st.success(f"✅ Managing address for: **{client_selection}**")
    
    # Show current address if it exists
    fields = record["fields"]
    current_street = fields.get("Street Address", "")
    current_city = fields.get("City", "")
    current_state = fields.get("State", "")
    current_zip = fields.get("ZIP Code", "")
    
    if any([current_street, current_city, current_state, current_zip]):
        st.subheader("📋 Current Address")
        with st.container():
            col1, col2 = st.columns([3, 1])
            with col1:
                if current_street:
                    st.text(f"Street: {current_street}")
                if current_city:
                    st.text(f"City: {current_city}")
                if current_state:
                    st.text(f"State: {current_state}")
                if current_zip:
                    st.text(f"ZIP: {current_zip}")
            with col2:
                if st.button("🗑️ Clear All", help="Clear all address fields"):
                    if st.session_state.get("confirm_clear", False):
                        try:
                            update_data = {
                                "Street Address": "",
                                "City": "",
                                "State": "",
                                "ZIP Code": ""
                            }
                            update_client_address(record["id"], update_data)
                            st.success("✅ Address cleared successfully!")
                            st.rerun()
                        except Exception as e:
                            st.error(f"Error clearing address: {e}")
                    else:
                        st.session_state.confirm_clear = True
                        st.warning("Click again to confirm clearing all address fields")
    else:
        st.info("📝 No address currently set for this client")
    
    st.divider()
    st.subheader("✏️ Update Address")
    
    # Address input form
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
            submit_button = st.form_submit_button(
                "💾 Save Address",
                type="primary",
                use_container_width=True
            )
        
        with col2:
            prefill_button = st.form_submit_button(
                "📋 Use Current",
                help="Prefill form with current address",
                use_container_width=True
            )
        
        with col3:
            clear_form_button = st.form_submit_button(
                "🧹 Clear Form",
                help="Clear all form fields",
                use_container_width=True
            )
    
    # Handle form submissions
    if submit_button:
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
                
                update_client_address(record["id"], update_data)
                st.success("✅ Address updated successfully!")
                
                # Refresh client records
                st.session_state.client_records = fetch_clients()
                st.rerun()
                
            except Exception as e:
                st.error(f"Error updating address: {e}")
    
    if prefill_button:
        st.info("Form prefilled with current address")
        st.rerun()
    
    if clear_form_button:
        st.info("Form cleared")
        st.rerun()
    
    # Reset confirmation state
    if "confirm_clear" in st.session_state and not any([submit_button, prefill_button, clear_form_button]):
        del st.session_state.confirm_clear
    
    st.divider()
    
    # Quick tips
    with st.expander("💡 Quick Tips"):
        st.markdown("""
        **Efficient Address Management:**
        - Use the dropdown for state selection to ensure consistency
        - ZIP codes are automatically validated for 5 digits
        - Changes are saved immediately to Airtable
        - Updated addresses will appear in all forms automatically
        
        **Address Format:**
        - Include apartment/unit numbers in street address
        - Use full state names (they'll be converted to abbreviations in forms)
        - Ensure ZIP codes are 5 digits only
        """)