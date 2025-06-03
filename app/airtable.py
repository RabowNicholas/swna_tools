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
    return table.all()
