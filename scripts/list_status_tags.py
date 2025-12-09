#!/usr/bin/env python3
"""
Script to list all unique Status tags from Airtable Clients table.
This script will help identify which tags represent external companies
vs. claims process statuses.
"""

from pyairtable import Table
import os
from dotenv import load_dotenv
from collections import Counter

load_dotenv()

AIRTABLE_PAT = os.getenv("AIRTABLE_PAT", "")
BASE_ID = os.getenv("AIRTABLE_BASE_ID", "")
TABLE_NAME = "Clients"


def list_all_status_tags():
    """Fetch all client records and list unique Status tags with counts."""

    print("Connecting to Airtable...")
    table = Table(AIRTABLE_PAT, BASE_ID, TABLE_NAME)

    print(f"Fetching all records from '{TABLE_NAME}' table...")
    records = table.all()

    print(f"Found {len(records)} total records\n")

    # Collect all status tags
    all_status_tags = []
    records_with_status = 0

    for record in records:
        fields = record.get('fields', {})
        status_field = fields.get('Status', [])

        # Status field is typically a list of strings in Airtable multi-select
        if status_field:
            records_with_status += 1
            if isinstance(status_field, list):
                all_status_tags.extend(status_field)
            else:
                # Handle case where it might be a single string
                all_status_tags.append(status_field)

    # Count occurrences of each tag
    tag_counts = Counter(all_status_tags)

    print(f"Records with Status values: {records_with_status}")
    print(f"Total unique Status tags: {len(tag_counts)}\n")

    print("=" * 70)
    print(f"{'Status Tag':<40} {'Count':>10}")
    print("=" * 70)

    # Sort by count (descending) then alphabetically
    for tag, count in sorted(tag_counts.items(), key=lambda x: (-x[1], x[0])):
        print(f"{tag:<40} {count:>10}")

    print("=" * 70)
    print(f"\nTotal tags found: {sum(tag_counts.values())}")

    return list(tag_counts.keys())


if __name__ == "__main__":
    try:
        status_tags = list_all_status_tags()
        print("\n✓ Status tags retrieved successfully!")
        print("\nNext step: Review the tags above and identify which ones represent")
        print("external companies (not claims process statuses).")
    except Exception as e:
        print(f"\n✗ Error: {e}")
        raise
