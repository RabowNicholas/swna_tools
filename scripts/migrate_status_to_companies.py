#!/usr/bin/env python3
"""
Script to migrate company-related tags from Status field to Associated Companies field.
This script will move all tags containing "HHC" or "Client" from Status to Associated Companies.

IMPORTANT: This script runs in DRY RUN mode by default and will NOT make any changes
unless you explicitly pass --execute flag.
"""

from pyairtable import Api
import os
from dotenv import load_dotenv
import argparse
from collections import defaultdict

load_dotenv()

AIRTABLE_PAT = os.getenv("AIRTABLE_PAT", "")
BASE_ID = os.getenv("AIRTABLE_BASE_ID", "")
TABLE_NAME = "Clients"

# Tags that should be moved from Status to Associated Companies
COMPANY_TAGS_TO_MOVE = [
    "AO Client",
    "GHHC Client",
    "CNS HHC",
    "Non-Affiliated Client",
    "Atomic HHC",
    "Roots HHC",
    "For Life HHC (AO)",
    "PCM HHC",
    "Maxim HHC",
    "Hallway HHC",
    "Trusted Ally HHC",
    "Sonder HHC",
    "NCP HHC",
    "Haven HHC",
    "Atomic Legacy HHC",
    "Caring Nurses HHC",
    "QPDC HHC",
    "Sky Canyon HHC",
    "UEW HHC",
]


def analyze_records():
    """Analyze which records will be affected and what changes will be made."""

    print("Connecting to Airtable...")
    api = Api(AIRTABLE_PAT)
    table = api.table(BASE_ID, TABLE_NAME)

    print(f"Fetching all records from '{TABLE_NAME}' table...")
    records = table.all()

    print(f"Found {len(records)} total records\n")

    # Track changes
    records_to_update = []
    company_tag_counts = defaultdict(int)

    for record in records:
        record_id = record['id']
        fields = record.get('fields', {})
        status_list = fields.get('Status', [])
        associated_companies = fields.get('Associated Companies', [])
        client_name = fields.get('Name', 'Unknown Client')

        # Find company tags in Status
        company_tags_found = [tag for tag in status_list if tag in COMPANY_TAGS_TO_MOVE]

        if company_tags_found:
            # Calculate new values
            new_status = [tag for tag in status_list if tag not in COMPANY_TAGS_TO_MOVE]
            new_companies = list(set(associated_companies + company_tags_found))  # Avoid duplicates

            # Track this record for update
            records_to_update.append({
                'id': record_id,
                'name': client_name,
                'company_tags': company_tags_found,
                'old_status': status_list,
                'new_status': new_status,
                'old_companies': associated_companies,
                'new_companies': new_companies
            })

            # Count each tag
            for tag in company_tags_found:
                company_tag_counts[tag] += 1

    return records_to_update, company_tag_counts


def display_analysis(records_to_update, company_tag_counts):
    """Display what changes will be made."""

    print("=" * 80)
    print("MIGRATION ANALYSIS - COMPANY TAGS TO MOVE")
    print("=" * 80)
    print(f"\nTotal records that will be affected: {len(records_to_update)}")

    if not records_to_update:
        print("\n✓ No records need to be updated. All company tags are already properly organized.")
        return

    print("\nCompany tags to be moved (count per tag):")
    print("-" * 80)
    for tag in sorted(COMPANY_TAGS_TO_MOVE):
        count = company_tag_counts.get(tag, 0)
        if count > 0:
            print(f"  {tag:<40} → {count:>5} record(s)")

    print("\n" + "=" * 80)
    print("DETAILED CHANGES (showing first 10 records as sample)")
    print("=" * 80)

    for i, update in enumerate(records_to_update[:10]):
        print(f"\n[{i+1}] Client: {update['name']}")
        print(f"    Record ID: {update['id']}")
        print(f"    Company tags found: {', '.join(update['company_tags'])}")
        print(f"    ")
        print(f"    Status field:")
        print(f"      BEFORE: {update['old_status']}")
        print(f"      AFTER:  {update['new_status']}")
        print(f"    ")
        print(f"    Associated Companies field:")
        print(f"      BEFORE: {update['old_companies']}")
        print(f"      AFTER:  {update['new_companies']}")

    if len(records_to_update) > 10:
        print(f"\n... and {len(records_to_update) - 10} more record(s)")

    print("\n" + "=" * 80)


def execute_migration(records_to_update):
    """Execute the actual migration (only runs with --execute flag)."""

    if not records_to_update:
        print("No records to update.")
        return

    print("\n" + "=" * 80)
    print("EXECUTING MIGRATION")
    print("=" * 80)

    api = Api(AIRTABLE_PAT)
    table = api.table(BASE_ID, TABLE_NAME)

    success_count = 0
    error_count = 0

    for i, update in enumerate(records_to_update, 1):
        try:
            # Update the record
            table.update(update['id'], {
                'Status': update['new_status'],
                'Associated Companies': update['new_companies']
            })
            success_count += 1
            print(f"[{i}/{len(records_to_update)}] ✓ Updated: {update['name']}")
        except Exception as e:
            error_count += 1
            print(f"[{i}/{len(records_to_update)}] ✗ Error updating {update['name']}: {e}")

    print("\n" + "=" * 80)
    print("MIGRATION COMPLETE")
    print("=" * 80)
    print(f"Successfully updated: {success_count} record(s)")
    print(f"Errors: {error_count} record(s)")


def main():
    parser = argparse.ArgumentParser(description='Migrate company tags from Status to Associated Companies')
    parser.add_argument('--execute', action='store_true',
                        help='Execute the migration (default is dry run only)')
    args = parser.parse_args()

    try:
        # Analyze what changes would be made
        records_to_update, company_tag_counts = analyze_records()
        display_analysis(records_to_update, company_tag_counts)

        if args.execute:
            print("\n⚠️  WARNING: You are about to modify Airtable records!")
            print("This will move company tags from Status to Associated Companies.")
            response = input("\nType 'YES' to proceed with migration: ")

            if response.strip().upper() == 'YES':
                execute_migration(records_to_update)
            else:
                print("\n✗ Migration cancelled by user.")
        else:
            print("\n" + "=" * 80)
            print("DRY RUN MODE - No changes were made")
            print("=" * 80)
            print("\nTo execute this migration, run:")
            print("  python3 scripts/migrate_status_to_companies.py --execute")

    except Exception as e:
        print(f"\n✗ Error: {e}")
        raise


if __name__ == "__main__":
    main()
