"""
Script 2: Remove completion tags from the 'Status' field.

Removes the 4 source tags from Status now that they have been migrated
into the 'Claim Complete' field by script 1.

⚠️  ONLY run this script AFTER confirming that
    scripts/1_populate_claim_complete.py --commit completed successfully
    and the 'Claim Complete' field looks correct in Airtable.

Run as dry-run (default):
    python scripts/2_remove_from_status.py

Run live:
    python scripts/2_remove_from_status.py --commit
"""

import argparse
import sys
import time

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # fall back to os.environ alone

import os
from pyairtable import Api

# ---------------------------------------------------------------------------
# Tags to remove from Status
# ---------------------------------------------------------------------------
TAGS_TO_REMOVE = {
    "Complete - PAID",
    "Complete SURV - PAID",
    "Part B Paid",
    "Complete No Payment",
}

TABLE_NAME = "Clients"
WRITE_DELAY = 0.25  # seconds between PATCH requests


def main(commit: bool) -> None:
    pat = os.environ.get("AIRTABLE_PAT")
    base_id = os.environ.get("AIRTABLE_BASE_ID")

    if not pat or not base_id:
        print("ERROR: AIRTABLE_PAT and AIRTABLE_BASE_ID must be set in .env or environment.")
        sys.exit(1)

    mode_label = "LIVE" if commit else "DRY-RUN"
    print(f"=== Remove Completion Tags from Status [{mode_label}] ===\n")

    api = Api(pat)
    table = api.table(base_id, TABLE_NAME)

    print("Fetching all records from Clients table...")
    records = table.all()
    print(f"Fetched {len(records)} records.\n")

    updated = 0
    skipped = 0
    failures = []

    for record in records:
        record_id = record["id"]
        fields = record.get("fields", {})
        name = fields.get("Name", record_id)

        status_tags: list[str] = fields.get("Status") or []

        # Find which source tags are present
        tags_found = [t for t in status_tags if t in TAGS_TO_REMOVE]

        if not tags_found:
            skipped += 1
            continue

        remaining = [t for t in status_tags if t not in TAGS_TO_REMOVE]

        print(f"  {'UPDATE' if commit else 'WOULD UPDATE'}: {name!r}")
        print(f"    Removing from Status : {tags_found}")
        print(f"    Remaining Status     : {remaining}")

        if commit:
            try:
                table.update(record_id, {"Status": remaining})
                time.sleep(WRITE_DELAY)
                updated += 1
            except Exception as exc:
                print(f"    ERROR updating {name!r}: {exc}")
                failures.append((name, str(exc)))
        else:
            updated += 1  # count as "would update" in dry-run

    print("\n=== Summary ===")
    print(f"  {'Updated' if commit else 'Would update'}: {updated}")
    print(f"  No matching tags (skipped): {skipped}")
    if failures:
        print(f"  FAILURES ({len(failures)}):")
        for name, err in failures:
            print(f"    - {name!r}: {err}")
    print()
    if not commit:
        print("Dry-run complete. Re-run with --commit to apply changes.")
    else:
        print("Done.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Remove completion tags from Status field.")
    parser.add_argument(
        "--commit",
        action="store_true",
        help="Apply changes (default is dry-run).",
    )
    args = parser.parse_args()
    main(commit=args.commit)
