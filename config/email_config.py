"""
Email configuration for IR request automation
Contains doctor contact information and routing logic
"""

# Doctor email addresses
DOCTOR_EMAILS = {
    "La Plata": "impairments@lpmedx.com",
    "Dr. Lewis": "admin@drlewis.org",
    "AO": "roxy@aomedicalgroup.com"
}

# Always CC this address
SWNA_EMAIL = "impairmentSWNA@outlook.com"

# Healthcare group emails
HHC_EMAILS = {
    "GHHC_NV": "ar.nv@givinghhc.com",
    "GHHC_TN": "ar.tn@givinghhc.com"
}

# Client status tags to look for in Airtable
CLIENT_STATUS_TAGS = {
    "AO": "AO Client",
    "GHHC": "GHHC Client"
}

def get_doctor_email(doctor_selection: str) -> str:
    """
    Get email address for selected doctor
    
    Args:
        doctor_selection: Doctor name ("La Plata", "Dr. Lewis", "AO")
    
    Returns:
        str: Doctor's email address
    """
    return DOCTOR_EMAILS.get(doctor_selection, "")

def get_email_recipients(
    doctor_selection: str, 
    client_status: str, 
    hhc_location: str = ""
) -> tuple[list, list]:
    """
    Determine TO and CC recipients based on doctor and client status
    
    Args:
        doctor_selection: Selected doctor ("La Plata", "Dr. Lewis")
        client_status: Client status ("AO Client", "GHHC Client", or "")
        hhc_location: For GHHC clients, location ("NV" or "TN")
    
    Returns:
        tuple: (to_recipients, cc_recipients) as lists of email addresses
    """
    # TO recipient is ALWAYS the selected doctor
    to_recipients = [get_doctor_email(doctor_selection)]
    
    # CC recipients start with SWNA email
    cc_recipients = [SWNA_EMAIL]
    
    # Add additional CC based on client status
    if client_status == CLIENT_STATUS_TAGS["AO"]:
        # AO clients get AO email in CC
        cc_recipients.append(DOCTOR_EMAILS["AO"])
    elif client_status == CLIENT_STATUS_TAGS["GHHC"] and hhc_location:
        # GHHC clients get HHC location in CC
        if hhc_location.upper() == "NV":
            cc_recipients.append(HHC_EMAILS["GHHC_NV"])
        elif hhc_location.upper() == "TN":
            cc_recipients.append(HHC_EMAILS["GHHC_TN"])
    
    return to_recipients, cc_recipients

def detect_client_status(client_record: dict) -> str:
    """
    Detect client status from Airtable record
    
    Args:
        client_record: Airtable client record with fields
    
    Returns:
        str: Client status ("AO Client", "GHHC Client", or "")
    """
    try:
        fields = client_record.get("fields", {})
        
        # Look for status tags in various possible fields
        # Common field names for status/tags in Airtable
        possible_status_fields = [
            "Status", "Tags", "Client Type", "Classification", 
            "Type", "Category", "Client Status"
        ]
        
        for field_name in possible_status_fields:
            field_value = fields.get(field_name)
            if field_value:
                # Handle both string and list formats
                if isinstance(field_value, list):
                    for tag in field_value:
                        if tag in CLIENT_STATUS_TAGS.values():
                            return tag
                elif isinstance(field_value, str):
                    if field_value in CLIENT_STATUS_TAGS.values():
                        return field_value
                    # Check if status is contained within the string
                    for status in CLIENT_STATUS_TAGS.values():
                        if status in field_value:
                            return status
        
        return ""  # No status found
    
    except Exception:
        return ""  # Error reading status

def is_hhc_client(client_status: str) -> bool:
    """
    Check if client is an GHHC client
    
    Args:
        client_status: Client status string
    
    Returns:
        bool: True if GHHC client, False otherwise
    """
    return client_status == CLIENT_STATUS_TAGS["GHHC"]

def is_ao_client(client_status: str) -> bool:
    """
    Check if client is an AO client
    
    Args:
        client_status: Client status string
    
    Returns:
        bool: True if AO client, False otherwise
    """
    return client_status == CLIENT_STATUS_TAGS["AO"]