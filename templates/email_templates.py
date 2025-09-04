"""
Email templates for IR requests to evaluating doctors
"""

# Standard template for La Plata and AO
STANDARD_IR_TEMPLATE = """Good morning,

Our client has elected to have La Plata perform their impairment evaluation. I have attached their causation and contact information here.

Name: {name}
Phone: {phone}
DOB: {dob}
Case ID: {case_id}
Address: {address}

Thank you, and please let us know how we can further assist."""

# Enhanced template for Dr. Lewis (includes work history)
DR_LEWIS_IR_TEMPLATE = """Good morning,

Our client has elected to have Dr. Lewis perform their impairment evaluation. I have attached their causation and contact information here.

Name: {name}
Phone: {phone}
DOB: {dob}
Case ID: {case_id}
Address: {address}
Verified WH Dates: {work_history_dates}

Thank you, and please let us know how we can further assist."""

def get_ir_template(doctor_selection: str) -> str:
    """
    Get the appropriate IR request template based on doctor selection
    
    Args:
        doctor_selection: Selected doctor ("La Plata", "Dr. Lewis", "AO")
    
    Returns:
        str: Appropriate email template
    """
    if doctor_selection == "Dr. Lewis":
        return DR_LEWIS_IR_TEMPLATE
    else:
        # Use standard template for La Plata and AO
        return STANDARD_IR_TEMPLATE

def format_ir_email(
    doctor_selection: str,
    name: str,
    phone: str,
    dob: str,
    case_id: str,
    address: str,
    work_history_dates: str = ""
) -> str:
    """
    Format IR request email with client information
    
    Args:
        doctor_selection: Selected doctor
        name: Client name
        phone: Client phone number
        dob: Client date of birth
        case_id: Case ID
        address: Client address
        work_history_dates: Work history dates (for Dr. Lewis only)
    
    Returns:
        str: Formatted email body
    """
    template = get_ir_template(doctor_selection)
    
    format_args = {
        'name': name,
        'phone': phone,
        'dob': dob,
        'case_id': case_id,
        'address': address
    }
    
    # Add work history for Dr. Lewis template
    if doctor_selection == "Dr. Lewis":
        format_args['work_history_dates'] = work_history_dates
    
    return template.format(**format_args)

def get_subject_line(client_name: str) -> str:
    """
    Generate subject line for IR request
    
    Args:
        client_name: Full client name
    
    Returns:
        str: Formatted subject line "IR Request: F. Last"
    """
    try:
        name_parts = client_name.strip().split()
        if len(name_parts) >= 2:
            first_initial = name_parts[0][0].upper()
            last_name = name_parts[-1]
            return f"IR Request: {first_initial}. {last_name}"
        else:
            # Fallback if name parsing fails
            return f"IR Request: {client_name}"
    except (IndexError, AttributeError):
        return f"IR Request: {client_name}"