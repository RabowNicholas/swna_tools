"""
Compile every ICD code that appears in the Final Decisions in Active Clients.

Runs entirely on this Mac. Text comes from pdftotext, or from tesseract OCR
for scanned decisions (most ECOMP printouts have no text layer). Only the
first few pages are OCR'd, since DOL lists the accepted conditions up front.

The summary keeps codes, condition wording and counts only. No client names,
case IDs or file paths are written to it. The per-file text cache does hold
client details, so it lives in a temp folder you pass with --work.

Usage:
    python scripts/fd_icd_codes.py --work /tmp/fd_icd            # full run
    python scripts/fd_icd_codes.py --work /tmp/fd_icd --limit 20 # quick test
    python scripts/fd_icd_codes.py --work /tmp/fd_icd --report   # re-summarize cache only
"""

import argparse
import csv
import hashlib
import os
import re
import subprocess
import sys
import tempfile
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ACTIVE_CLIENTS = Path.home() / "Library/CloudStorage/Sync/1. SWNA Shared Folder/2. Active Clients"
OCR_PAGES = 4
MIN_TEXT_CHARS = 800  # below this the PDF is treated as a scan

# Codes already offered in the Desert Pulmonary diagnosis dropdown.
DROPDOWN = {"J62.8", "G47.33", "R06.02", "J45.909"}

FD_NAME = re.compile(r"^(FD[\s_-]|.*final decision|.*\bFFD\b)", re.I)
NOT_FD = re.compile(r"request|objection|waiver", re.I)

# ICD-10-CM: letter, digit, digit/letter, optional dot + 1-4 chars.
ICD10 = r"[A-TV-Z][0-9O][0-9A-Z](?:\.[0-9A-Z]{1,4})?"
# "(J62.8)", "(ICD-10 J62.8)", "(ICD 10: J62.8, J84.10)"
PAREN = re.compile(r"\(\s*(?:ICD[\s-]*(?:10)?(?:[\s-]*CM)?\s*(?:code)?\s*[:#]?\s*)?(" + ICD10 + r"(?:\s*[,/;]\s*" + ICD10 + r")*)\s*\)")
# "ICD-10 code J62.8" without parentheses
BARE10 = re.compile(r"ICD[\s-]*10(?:[\s-]*CM)?\s*(?:code)?\s*[:#]?\s*(" + ICD10 + r")\b", re.I)
# "ICD-9 502" / "(ICD-9 code 496)"
ICD9 = re.compile(r"ICD[\s-]*9(?:[\s-]*CM)?\s*(?:code)?\s*[:#]?\s*(V?\d{3}(?:\.\d{1,2})?)\b", re.I)

DENY = re.compile(r"\bden(?:y|ies|ied|ial)\b|not (?:been )?accepted|insufficient", re.I)
ACCEPT = re.compile(r"\baccept(?:s|ed)?\b|\bapprov(?:e|es|ed|al)\b|\bentitled\b|consequential", re.I)

# Words that end the condition name when walking back from the code.
NAME_STOP = re.compile(
    r"(?:^|[.;:,]\s|[¢•●▪*]\s|\b\d{4}\s|\bdiagnos(?:is|ed|es) (?:of|with)\s|\bclaim(?:ed)? for\s|\bfor\s|\bof\s(?=[A-Z])|\band\s|\bwith\s|\bincluding\s|\bthe\s)",
    re.I,
)
QUALIFIER = re.compile(r"\s*(unspecified|other|without|with|not elsewhere|nos\b|chronic|acute|due to)", re.I)


def find_decisions(root):
    seen = set()
    for dirpath, _, files in os.walk(root):
        for name in files:
            if not name.lower().endswith(".pdf") or not FD_NAME.match(name) or NOT_FD.search(name):
                continue
            path = Path(dirpath) / name
            try:
                key = (name, path.stat().st_size)
            except OSError:
                continue
            if key not in seen:  # same decision copied into several subfolders
                seen.add(key)
                yield path


def cache_path(work, pdf):
    return work / "text" / (hashlib.sha1(str(pdf).encode()).hexdigest() + ".txt")


def extract(pdf, work):
    out = cache_path(work, pdf)
    if out.exists():
        return out
    text = subprocess.run(["pdftotext", "-layout", "-l", str(OCR_PAGES), str(pdf), "-"],
                          capture_output=True, text=True).stdout
    useful = re.sub(r"PRINTED FROM ECOMP.*|Received:.*Page \d+ / \d+|\s+", "", text)
    if len(useful) < MIN_TEXT_CHARS:
        with tempfile.TemporaryDirectory() as tmp:
            subprocess.run(["pdftoppm", "-r", "200", "-gray", "-png", "-l", str(OCR_PAGES),
                            str(pdf), f"{tmp}/p"], capture_output=True)
            pages = []
            for png in sorted(Path(tmp).glob("p-*.png")):
                pages.append(subprocess.run(["tesseract", str(png), "-", "--psm", "6"],
                                            capture_output=True, text=True).stdout)
            text = "\n".join(pages)
    out.write_text(text)
    return out


def fix_ocr(code):
    # OCR reads 0 as O in the digit position.
    return code[0] + code[1:3].replace("O", "0") + code[3:].replace("O", "0")


def condition_name(text, start):
    before = text[max(0, start - 120):start]
    before = re.sub(r"\s+", " ", before).rstrip()
    stops = list(NAME_STOP.finditer(before))
    name = before[stops[-1].end():] if stops else before[-60:]
    # "Anemia, unspecified (D64.9)": keep the part before the comma
    if len(stops) > 1 and QUALIFIER.match(name):
        name = before[stops[-2].end():]
    name = re.sub(r"^(?:your\s+)?(?:accepted\s+|claimed\s+)?", "", name.strip(), flags=re.I)
    name = name.strip(" -–(").lower()
    # OCR turns bullet points into «, ¢, °, e, + and similar
    name = re.sub(r"^(?:[^a-z0-9]+|e\s|e«\s)+", "", name)
    if len(name) < 3 or len(name.split()) > 9 or re.search(r"\d{4}|retroactive", name):
        return ""
    return name


def status_for(text, start, filename_deny):
    # Look at the sentence the code sits in.
    s = text.rfind(".", 0, start - 1)
    e = text.find(".", start)
    sentence = text[s + 1:e if e != -1 else start + 200]
    if DENY.search(sentence):
        return "denied"
    if ACCEPT.search(sentence):
        return "accepted"
    # Bulleted lists: the verb is in the lead-in ("FAB accepts the following...")
    lead_in = text[max(0, start - 400):start]
    if DENY.search(lead_in) and not ACCEPT.search(lead_in):
        return "denied"
    if ACCEPT.search(lead_in) and not DENY.search(lead_in):
        return "accepted"
    return "denied" if filename_deny else "unclear"


def codes_in(text, filename_deny):
    text = text.replace("—", "-").replace("–", "-")
    hits = []
    for m in PAREN.finditer(text):
        for code in re.split(r"\s*[,/;]\s*", m.group(1)):
            hits.append(("ICD-10", code, m.start()))
    for m in BARE10.finditer(text):
        hits.append(("ICD-10", m.group(1).upper(), m.start()))
    for m in ICD9.finditer(text):
        hits.append(("ICD-9", m.group(1), m.start()))
    for kind, code, pos in hits:
        if kind == "ICD-10":
            if not any(c.isdigit() for c in code[1:3]):
                continue  # "(DOE)" is not D0E
            code = fix_ocr(code)
        yield kind, code, condition_name(text, pos), status_for(text, pos, filename_deny)


def summarize(work, files):
    per_code = defaultdict(lambda: {"kind": "", "fds": set(), "names": Counter(), "status": Counter()})
    empty = 0
    for i, pdf in enumerate(files):
        cp = cache_path(work, pdf)
        if not cp.exists():
            continue
        text = cp.read_text(errors="ignore")
        if len(text.strip()) < 200:
            empty += 1
        filename_deny = bool(re.search(r"\bden(y|ied|ial)\b", pdf.name, re.I))
        found = defaultdict(set)
        for kind, code, name, status in codes_in(text, filename_deny):
            row = per_code[code]
            row["kind"] = kind
            row["fds"].add(i)
            if name:
                row["names"][name] += 1
            found[code].add(status)
        # One status per decision: denied wins, then accepted.
        for code, statuses in found.items():
            for status in ("denied", "accepted", "unclear"):
                if status in statuses:
                    per_code[code]["status"][status] += 1
                    break

    rows = sorted(per_code.items(), key=lambda kv: (-len(kv[1]["fds"]), kv[0]))
    out = work / "fd_icd_codes.csv"
    with out.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["code", "type", "final_decisions", "accepted", "denied", "unclear",
                    "in_desert_pulm_dropdown", "condition_names_as_written"])
        for code, r in rows:
            names = "; ".join(f"{n} ({c})" for n, c in r["names"].most_common(4))
            w.writerow([code, r["kind"], len(r["fds"]), r["status"]["accepted"], r["status"]["denied"],
                        r["status"]["unclear"], "yes" if code in DROPDOWN else "", names])
    print(f"{len(rows)} distinct codes from {len(files)} decisions ({empty} unreadable) -> {out}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--work", required=True, type=Path, help="temp folder for the text cache and summary")
    ap.add_argument("--limit", type=int, help="only process the first N decisions")
    ap.add_argument("--jobs", type=int, default=8)
    ap.add_argument("--report", action="store_true", help="skip extraction, summarize what's cached")
    args = ap.parse_args()

    (args.work / "text").mkdir(parents=True, exist_ok=True)
    list_file = args.work / "decisions.txt"
    if list_file.exists():
        files = [Path(p) for p in list_file.read_text().splitlines() if p]
    else:
        print("Finding Final Decisions (slow: Sync folder)...", flush=True)
        files = list(find_decisions(ACTIVE_CLIENTS))
        list_file.write_text("\n".join(map(str, files)))
    if args.limit:
        files = files[:args.limit]
    print(f"{len(files)} Final Decisions", flush=True)

    if not args.report:
        done = 0
        with ThreadPoolExecutor(args.jobs) as pool:
            futures = [pool.submit(extract, p, args.work) for p in files]
            for fut in as_completed(futures):
                done += 1
                try:
                    fut.result()
                except Exception as e:
                    print(f"  failed: {e}", file=sys.stderr)
                if done % 100 == 0:
                    print(f"  {done}/{len(files)}", flush=True)

    summarize(args.work, files)


if __name__ == "__main__":
    main()
