"""
Script 1: Populate 'Claim Complete' field from 'Status' field.

Reads the 4 completion tags from Status and writes mapped values into
Claim Complete. Existing Claim Complete values are preserved (merge, no overwrite).

Run as dry-run (default):
    python scripts/1_populate_claim_complete.py

Run live:
    python scripts/1_populate_claim_complete.py --commit

IMPORTANT: Run this script and confirm results in Airtable BEFORE running
           scripts/2_remove_from_status.py
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
# Tag mapping: Status tag → Claim Complete tag
# ---------------------------------------------------------------------------
TAG_MAP = {
    "Complete - PAID": "Complete Paid",
    "Complete SURV - PAID": "Complete Paid (SURV)",
    "Part B Paid": "Part B Paid",
    "Complete No Payment": "Complete No Payment",
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
    print(f"=== Populate Claim Complete [{mode_label}] ===\n")

    api = Api(pat)
    table = api.table(base_id, TABLE_NAME)

    print("Fetching all records from Clients table...")
    records = table.all()
    print(f"Fetched {len(records)} records.\n")

    updated = 0
    skipped = 0
    already_complete = 0
    failures = []

    for record in records:
        record_id = record["id"]
        fields = record.get("fields", {})
        name = fields.get("Name", record_id)

        status_tags: list[str] = fields.get("Status") or []
        claim_complete_tags: list[str] = fields.get("Claim Complete") or []

        # Find which source tags are present and map them
        to_add = [
            TAG_MAP[tag]
            for tag in status_tags
            if tag in TAG_MAP
        ]

        if not to_add:
            skipped += 1
            continue

        # Merge with existing Claim Complete values, deduplicating
        merged = list(dict.fromkeys(claim_complete_tags + to_add))

        # Check if there's actually anything new to add
        new_values = [v for v in to_add if v not in claim_complete_tags]
        if not new_values:
            already_complete += 1
            print(f"  SKIP (already set): {name!r} — Claim Complete already contains {to_add}")
            continue

        print(f"  {'UPDATE' if commit else 'WOULD UPDATE'}: {name!r}")
        print(f"    Status tags found : {[t for t in status_tags if t in TAG_MAP]}")
        print(f"    Adding to Claim Complete: {new_values}")
        print(f"    Final Claim Complete: {merged}")

        if commit:
            try:
                table.update(record_id, {"Claim Complete": merged})
                time.sleep(WRITE_DELAY)
                updated += 1
            except Exception as exc:
                print(f"    ERROR updating {name!r}: {exc}")
                failures.append((name, str(exc)))
        else:
            updated += 1  # count as "would update" in dry-run

    print("\n=== Summary ===")
    print(f"  {'Updated' if commit else 'Would update'}: {updated}")
    print(f"  Already set (skipped): {already_complete}")
    print(f"  No matching Status tags (skipped): {skipped}")
    if failures:
        print(f"  FAILURES ({len(failures)}):")
        for name, err in failures:
            print(f"    - {name!r}: {err}")
    print()
    if not commit:
        print("Dry-run complete. Re-run with --commit to apply changes.")
    else:
        print("Done. Verify results in Airtable before running script 2.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Populate Claim Complete from Status tags.")
    parser.add_argument(
        "--commit",
        action="store_true",
        help="Apply changes (default is dry-run).",
    )
    args = parser.parse_args()
    main(commit=args.commit)
