"""
Follow-up lists for the office: stalled intakes and cases behind schedule.

Reads the Airtable Clients table (read-only, nothing is written back) and
builds one spreadsheet with three tabs:

  1. Intake follow-up   — clients still at intake (forms, testing, first
                          contact, waiting on client) with no Log activity
                          in INTAKE_DAYS or more. Owner = the initials on the
                          client's OLDEST Log entry (whoever did intake).
  2. Behind schedule    — open cases past the normal time for their stage,
                          measured as days since the last Log entry:
                            Not filed yet (our work)   120 days
                            Filed, no RD                180 days
                            RD, no FD                    60 days
                            Open RFI                     30 days
                          "Last touched by" = initials on the NEWEST entry.
  3. Over a year        — anything from tabs 1–2 with no Log activity in over
                          a year. Likely withdrawn / deceased / dead lead:
                          confirm and re-tag rather than chase.

Clients tagged Withdrawn, Deceased, DOD, Stagnant or Waiting Until 10-yr Latency are left out, and so are RD cases already objected to (waiting on FAB).

Run:
    .venv/bin/python scripts/followup_lists.py
Options:
    --out PATH   where to write the .xlsx
                 (default: ~/Desktop/swna/Claude outputs/SWNA_Followup_Lists_<date>.xlsx)
    --env PATH   .env with AIRTABLE_PAT and AIRTABLE_BASE_ID (default: web/.env.local)
"""

import argparse
import datetime as dt
import re
from collections import Counter
from pathlib import Path

from dotenv import dotenv_values
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from pyairtable import Api

REPO = Path(__file__).resolve().parent.parent
TODAY = dt.date.today()

INTAKE_DAYS = 60
OVER_A_YEAR = 365

INTAKE_TAGS = {
    "Wait on SWNA Forms", "Waiting for SWNA Forms", "CXR/PFT Requested",
    "1st Cont. Need", "Advised to Get Testing", "Needs Testing Advisement",
    "Waiting on Client", "Follow-Up Needed", "Client Needs Contact",
}

# Ordered least → most advanced; a client in several stages is filed under
# the most advanced one.
STAGES = [
    ("Not filed yet (our work)", 120, {
        "File Review - Toupin", "Ready to send Toupin", "Ready to send Herold",
        "Drafting", "Drafting (CS)", "Drafting (Emphysema)", "Drafting (PN)",
        "Drafting (RLD)", "Drafting (COPD)", "Drafting (PF)", "Working on CQs",
        "CXR Ready for Dr. Smith", "In B-Read - Smith", "Med Pending",
        "MR Requested", "Ready to File", "Claim Pre-Submitted",
    }),
    ("Filed, no RD", 180, {"Claim Submitted", "Claim Established", "Claim Developed"}),
    ("Open RFI", 30, {"DOL RFI", "WH RFI", "Med RFI", "CQ RFI", "Surv RFI"}),
    ("RD, no FD", 60, {"RD Accept", "RD Deny", "RD Accept E/Deny B", "RD Accept IR", "RD Deny IR"}),
]

EXCLUDE_TAGS = {"Withdrawn", "Deceased", "DOD", "Stagnant", "Waiting Until 10-yr Latency"}

DATE_RE = re.compile(r"\b(\d{1,2})[./](\d{1,2})[./](\d{4}|\d{2})\b")
# initials right after a date at the end of the line: "9.25.26 RDS", "4.20.23 trb"
DATE_INIT_RE = re.compile(r"\b\d{1,2}[./]\d{1,2}[./](?:\d{4}|\d{2})\s*[-–]?\s*([A-Za-z]{2,4})[\s.)]*$")
NOT_INITIALS = {"TOOLS", "APP", "AM", "PM", "THE", "AND", "TO", "FOR", "VIA"}


def parse_date(m, d, y):
    y = int(y)
    y = y + 2000 if y < 100 else y
    try:
        x = dt.date(y, int(m), int(d))
    except ValueError:
        return None
    return x if dt.date(2015, 1, 1) <= x <= TODAY else None


def log_entries(log):
    """[(date, initials or None, line)] for every Log line that has a date."""
    out = []
    for line in (log or "").splitlines():
        line = line.strip()
        ds = [x for x in (parse_date(*g) for g in DATE_RE.findall(line)) if x]
        if not ds:
            continue
        inits = [i.upper() for i in DATE_INIT_RE.findall(line) if i.upper() not in NOT_INITIALS]
        out.append((max(ds), inits[-1] if inits else None, line))
    return out


def pick(entries, oldest):
    """Initials from the oldest (or newest) dated entry that has initials."""
    tagged = [e for e in entries if e[1]]
    if not tagged:
        return "?"
    e = min(tagged, key=lambda e: e[0]) if oldest else max(tagged, key=lambda e: e[0])
    return e[1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path,
                    default=Path.home() / f"Desktop/swna/Claude outputs/SWNA_Followup_Lists_{TODAY.isoformat()}.xlsx")
    ap.add_argument("--env", type=Path, default=REPO / "web/.env.local")
    args = ap.parse_args()

    env = dotenv_values(args.env)
    table = Api(env["AIRTABLE_PAT"]).table(env["AIRTABLE_BASE_ID"], "Clients")
    rows = table.all(fields=["Name", "Case ID", "Phone", "Status", "Associated Companies", "Log"])

    intake, behind, old = [], [], []
    for r in rows:
        f = r["fields"]
        tags = set(f.get("Status", []))
        tags |= {t.strip() for t in tags}
        if tags & EXCLUDE_TAGS:
            continue
        entries = log_entries(f.get("Log"))
        last = max((e[0] for e in entries), default=None)
        days = (TODAY - last).days if last else None
        newest_line = max(entries, key=lambda e: e[0])[2] if entries else (f.get("Log") or "").strip()[:200]
        base = {
            "name": f.get("Name", ""),
            "case": f.get("Case ID", ""),
            "phone": f.get("Phone", ""),
            "status": ", ".join(sorted(f.get("Status", []))),
            "source": ", ".join(f.get("Associated Companies", [])),
            "last": last,
            "days": days,
            "entry": newest_line[:250],
        }

        stage = None
        for name, limit, stage_tags in STAGES:
            if tags & stage_tags:
                stage = (name, limit)
        # RD already objected to: waiting on the FAB hearing, not on us.
        if stage and stage[0] == "RD, no FD" and ("Objected" in tags or "object" in newest_line.lower()):
            stage = None
            if not tags & INTAKE_TAGS:
                continue

        if stage:
            name, limit = stage
            if days is None or days > limit:
                row = dict(base, stage=name, limit=limit, owner=pick(entries, oldest=False),
                           overdue=(days - limit) if days is not None else None)
                (old if days is None or days > OVER_A_YEAR else behind).append(row)
        elif tags & INTAKE_TAGS:
            if days is None or days >= INTAKE_DAYS:
                row = dict(base, stage="Intake", limit=INTAKE_DAYS, owner=pick(entries, oldest=True),
                           overdue=None)
                (old if days is None or days > OVER_A_YEAR else intake).append(row)

    intake.sort(key=lambda r: (r["owner"] == "?", r["owner"], -(r["days"] or 0)))
    stage_order = {s[0]: i for i, s in enumerate(STAGES)}
    behind.sort(key=lambda r: (stage_order[r["stage"]], -(r["overdue"] or 0)))
    old.sort(key=lambda r: (r["stage"], -(r["days"] or 99999)))

    wb = Workbook()
    head_font = Font(bold=True, color="FFFFFF")
    head_fill = PatternFill("solid", fgColor="2F4F6F")

    def sheet(ws, cols, data):
        ws.append([c[0] for c in cols])
        for cell in ws[1]:
            cell.font, cell.fill = head_font, head_fill
        for r in data:
            ws.append([c[1](r) for c in cols])
        for i, c in enumerate(cols, 1):
            ws.column_dimensions[ws.cell(1, i).column_letter].width = c[2]
        for row in ws.iter_rows(min_row=2):
            row[-1].alignment = Alignment(wrap_text=True, vertical="top")
        ws.freeze_panes = "A2"
        ws.auto_filter.ref = ws.dimensions

    fmt = lambda d: d.strftime("%m/%d/%Y") if d else "no dated entry"
    common_tail = [
        ("Client", lambda r: r["name"], 32),
        ("Case ID", lambda r: r["case"], 12),
        ("Phone", lambda r: r["phone"], 15),
        ("Status", lambda r: r["status"], 28),
        ("Referral source", lambda r: r["source"], 16),
        ("Last activity", lambda r: fmt(r["last"]), 14),
        ("Days quiet", lambda r: r["days"], 10),
        ("Done? (initials + date)", lambda r: "", 18),
        ("Most recent Log entry", lambda r: r["entry"], 70),
    ]

    ws = wb.active
    ws.title = "Intake follow-up"
    sheet(ws, [("Owner (did intake)", lambda r: r["owner"], 12)] + common_tail, intake)

    ws = wb.create_sheet("Behind schedule")
    sheet(ws, [
        ("Stage", lambda r: r["stage"], 22),
        ("Normal max (days)", lambda r: r["limit"], 10),
        ("Days over", lambda r: r["overdue"], 10),
        ("Last touched by", lambda r: r["owner"], 10),
    ] + common_tail, behind)

    ws = wb.create_sheet("Over a year")
    sheet(ws, [
        ("Stage", lambda r: r["stage"], 22),
        ("Initials", lambda r: r["owner"], 10),
    ] + common_tail, old)

    ws = wb.create_sheet("How this was built")
    notes = [
        f"Built {TODAY:%m/%d/%Y} from Airtable Clients. Nothing in Airtable was changed.",
        "Clients tagged Withdrawn, Deceased, DOD, Stagnant or Waiting Until 10-yr Latency are left out, and so are RD cases already objected to (waiting on FAB).",
        "'Days quiet' = days since the newest dated Log entry.",
        f"Intake follow-up: intake/first-contact/forms/testing tags, nothing logged in {INTAKE_DAYS}+ days. Owner = initials on the client's oldest Log entry. '?' = no readable initials.",
        "Behind schedule: " + "; ".join(f"{n} over {l} days" for n, l, _ in STAGES) + ". Clients in more than one stage are listed under the most advanced one.",
        "Over a year: no Log activity in 365+ days. Likely withdrawn, deceased or dead leads; confirm and re-tag.",
        "",
        "Counts by owner (Intake follow-up):",
    ] + [f"  {k}: {v}" for k, v in Counter(r["owner"] for r in intake).most_common()] + [
        "",
        "Counts by stage (Behind schedule):",
    ] + [f"  {k}: {v}" for k, v in Counter(r["stage"] for r in behind).most_common()] + [
        "",
        f"Over a year: {len(old)}",
    ]
    for n in notes:
        ws.append([n])
    ws.column_dimensions["A"].width = 120

    args.out.parent.mkdir(parents=True, exist_ok=True)
    wb.save(args.out)
    print(f"Intake follow-up: {len(intake)}  Behind schedule: {len(behind)}  Over a year: {len(old)}")
    print("\n".join(notes[7:]))
    print(f"Saved {args.out}")


if __name__ == "__main__":
    main()
