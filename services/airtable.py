# app/services/airtable_client.py
from pyairtable import Table
import os
from dotenv import load_dotenv

load_dotenv()

AIRTABLE_PAT = os.getenv("AIRTABLE_PAT", "")
BASE_ID = os.getenv("AIRTABLE_BASE_ID", "")
TABLE_NAME = "Clients"


def fetch_clients():
    table = Table(AIRTABLE_PAT, BASE_ID, TABLE_NAME)
    return table.all(sort=["Name"])


def fetch_invoice_by_id(record_id):
    invoice_table = Table(AIRTABLE_PAT, BASE_ID, "Invoicing")
    return invoice_table.get(record_id)


def update_client_data(record_id, client_data):
    """
    Update client data fields in Airtable
    
    Args:
        record_id: Airtable record ID
        client_data: Dict with client data fields
    
    Returns:
        Updated record
    """
    table = Table(AIRTABLE_PAT, BASE_ID, TABLE_NAME)
    return table.update(record_id, client_data)


def update_client_address(record_id, address_data):
    """
    Update client address fields in Airtable (legacy function - use update_client_data)
    
    Args:
        record_id: Airtable record ID
        address_data: Dict with address fields
    
    Returns:
        Updated record
    """
    return update_client_data(record_id, address_data)
