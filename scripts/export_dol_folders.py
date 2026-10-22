"""
Export every client's DOL folders out of Sync into one new folder.

Walks Sync/1. SWNA Shared Folder/2. Active Clients and, for each client,
searches the whole client folder (any depth) for its "DOL Letters" and
"Submitted DOL" folders, then copies them into a new export folder that
mirrors the same layout:

    <export>/
        Smith, John/
            DOL Letters/...
            Submitted DOL/...

Nothing in Sync is moved, renamed, or deleted — this only copies.

Run as dry-run (default) — lists what would be copied, copies nothing:
    python scripts/export_dol_folders.py

Run live:
    python scripts/export_dol_folders.py --commit

Options:
    --source PATH   Active Clients folder (default: the Sync path below)
    --dest PATH     Export folder (default: ~/Desktop/DOL Export)
    --limit N       Only process the first N clients (for a test run)
    --match TEXT    Only clients whose folder name contains TEXT (repeatable)
    --workers N     Clients processed at once (default 8)
    --stall-timeout SECONDS
                    Give up on a client after this long with no progress
                    (default 300). It's marked TIMED OUT in the report.
    --min-free-gb N Stop copying when the export drive or the Mac drops
                    below N GB free (default 15). Free up space, re-run,
                    and it resumes.

Re-running is safe: files that already exist in the export with the same
size are skipped, so an interrupted run picks up where it left off.

The search finds every DOL folder in the client folder, including the old
layout (Claims, Packets, Drafts/Submitted DOL, sometimes one per person).
The shallowest one is exported as-is; any others go inside it in a
"from <where it was>" subfolder. Template copies and other clients' folders
misfiled inside this one are skipped.

A report (export_report.csv) lists each client with, per DOL folder:
"found" (top level), "nested: <path>" (found deeper), or "MISSING", plus
any extra locations. The flag column marks POTENTIALLY MISSING, MULTIPLE,
and TIMED OUT (Sync stopped responding for that client's folder — re-run
those later with --match).
"""

import argparse
import csv
import os
import re
import shutil
import sys
import threading
import time
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait
from pathlib import Path

DEFAULT_SOURCE = (
    Path.home()
    / "Library/CloudStorage/Sync/1. SWNA Shared Folder/2. Active Clients"
)
DEFAULT_DEST = Path.home() / "Desktop/DOL Export"

# Folders in Active Clients that aren't clients.
SKIP_CLIENT_FOLDERS = {"1. Template for Copying"}

# Canonical subfolder name -> pattern matching the spellings used in Sync.
# Matched case-insensitively against the whole folder name.
TARGET_FOLDERS = {
    "DOL Letters": re.compile(r"^\s*dol\s+letters?\s*$", re.I),
    "Submitted DOL": re.compile(r"^\s*submitted\s+(to\s+)?dol\s*$", re.I),
}


# Client name -> time of its last folder listed / file copied. A client
# whose time goes stale is stuck waiting on Sync.
last_progress: dict[str, float] = {}


def touch(client_name: str) -> None:
    last_progress[client_name] = time.monotonic()


# Set once a disk runs low; every worker stops copying.
out_of_space = threading.Event()
min_free_bytes = 0
# Sync downloads each file onto the Mac before it's copied, so watch the
# Mac's disk as well as the export drive.
space_checked_paths: list[Path] = [Path.home()]


def low_on_space() -> bool:
    if out_of_space.is_set():
        return True
    for path in space_checked_paths:
        if shutil.disk_usage(path).free < min_free_bytes:
            out_of_space.set()
            return True
    return False


def is_skipped_subfolder(name: str, client_names: set[str]) -> bool:
    """Folders not to search inside: template copies and misfiled clients."""
    return "template" in name.lower() or name in client_names


def find_targets(
    client_dir: Path, client_names: set[str]
) -> dict[str, list[Path]]:
    """Search the whole client folder for every DOL folder.

    Breadth-first, so matches come back shallowest first. Doesn't search
    inside a folder once it matches.
    """
    found: dict[str, list[Path]] = {name: [] for name in TARGET_FOLDERS}
    queue = [client_dir]
    while queue:
        folder = queue.pop(0)
        try:
            entries = sorted(
                (e for e in os.scandir(folder) if e.is_dir()),
                key=lambda e: e.name.lower(),
            )
            touch(client_dir.name)
        except OSError as e:
            print(f"  ! can't read {folder}: {e}", file=sys.stderr)
            continue
        for entry in entries:
            if is_skipped_subfolder(entry.name, client_names):
                continue
            matched = False
            for name, pattern in TARGET_FOLDERS.items():
                if pattern.match(entry.name):
                    matched = True
                    found[name].append(Path(entry.path))
            if not matched:
                queue.append(Path(entry.path))
    return found


def extra_label(match: Path, client_dir: Path) -> str:
    """Subfolder name for an extra match, from where it sits in Sync.

    "Claims, Packets, Drafts/Francine Docs/Submitted DOL"
        -> "from Claims, Packets, Drafts - Francine Docs"
    """
    parents = match.relative_to(client_dir).parent.parts
    return "from " + (" - ".join(parents) if parents else match.name)


def copy_tree(
    src: Path, dst: Path, commit: bool, client_name: str
) -> tuple[int, int]:
    """Copy src into dst, skipping files already there with the same size.

    Returns (files copied, files skipped).
    """
    copied = skipped = 0
    for root, _dirs, files in os.walk(src):
        rel = Path(root).relative_to(src)
        out_dir = dst / rel
        if commit:
            out_dir.mkdir(parents=True, exist_ok=True)
        for fname in files:
            if fname.startswith("."):  # .DS_Store, sync temp files
                continue
            s = Path(root) / fname
            d = out_dir / fname
            try:
                if d.exists() and d.stat().st_size == s.stat().st_size:
                    skipped += 1
                    continue
                if commit:
                    if low_on_space():
                        return copied, skipped
                    shutil.copy2(s, d)
                copied += 1
                touch(client_name)
            except OSError as e:
                print(f"  ! failed {s}: {e}", file=sys.stderr)
    return copied, skipped


def process_client(
    client: Path, client_names: set[str], dest: Path, commit: bool
) -> tuple[dict, int, int]:
    """Find and copy one client's DOL folders.

    Returns (report row, files copied, files skipped).
    """
    touch(client.name)
    targets = find_targets(client, client_names)
    row = {"client": client.name}
    flags = []
    copied = skipped = 0
    for name, matches in targets.items():
        if not matches:
            row[name] = "MISSING"
            flags.append("POTENTIALLY MISSING")
            continue
        first, extras = matches[0], matches[1:]
        rel = first.relative_to(client)
        row[name] = "found" if len(rel.parts) == 1 else f"nested: {rel}"
        out = dest / client.name / name
        c, s = copy_tree(first, out, commit, client.name)
        copied += c
        skipped += s
        # Extra copies (old layout, one per person) go in a subfolder
        # so same-named files can't overwrite each other.
        for extra in extras:
            c, s = copy_tree(extra, out / extra_label(extra, client), commit,
                             client.name)
            copied += c
            skipped += s
        if extras:
            row[name] += f" + {len(extras)} more: " + "; ".join(
                str(e.relative_to(client)) for e in extras)
            flags.append("MULTIPLE")
    row["flag"] = ", ".join(dict.fromkeys(flags))
    return row, copied, skipped


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--commit", action="store_true", help="actually copy files")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--dest", type=Path, default=DEFAULT_DEST)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--match", action="append", default=[])
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--stall-timeout", type=int, default=300)
    parser.add_argument("--min-free-gb", type=float, default=15)
    args = parser.parse_args()

    source: Path = args.source.expanduser()
    dest: Path = args.dest.expanduser()

    if not source.is_dir():
        sys.exit(f"Source folder not found: {source}")
    if dest.resolve().is_relative_to(source.resolve()):
        sys.exit("Export folder can't be inside the Active Clients folder.")

    global min_free_bytes
    min_free_bytes = int(args.min_free_gb * 1e9)
    if args.commit:
        dest.mkdir(parents=True, exist_ok=True)
        space_checked_paths.append(dest)
        if low_on_space():
            sys.exit(f"Less than {args.min_free_gb:g} GB free — free up "
                     "space or pick another --dest.")

    mode = "LIVE" if args.commit else "DRY RUN"
    print(f"[{mode}] {source}\n        -> {dest}\n")

    clients = sorted(
        (Path(e.path) for e in os.scandir(source)
         if e.is_dir() and e.name not in SKIP_CLIENT_FOLDERS),
        key=lambda p: p.name.lower(),
    )
    client_names = {c.name for c in clients}
    if args.match:
        needles = [m.lower() for m in args.match]
        clients = [c for c in clients
                   if any(n in c.name.lower() for n in needles)]
    if args.limit:
        clients = clients[: args.limit]

    report_rows = []
    total_copied = total_skipped = 0

    # Each folder listing is a round-trip through Sync, so clients are
    # processed several at a time.
    pool = ThreadPoolExecutor(max_workers=args.workers)
    pending = {
        pool.submit(process_client, client, client_names, dest, args.commit):
            client.name
        for client in clients
    }
    timed_out = []
    i = 0
    while pending and not out_of_space.is_set():
        done, _ = wait(pending, timeout=5, return_when=FIRST_COMPLETED)
        for future in done:
            pending.pop(future)
            row, c, s = future.result()
            total_copied += c
            total_skipped += s
            report_rows.append(row)
            i += 1
            status = "; ".join(f"{n}: {row[n]}" for n in TARGET_FOLDERS)
            print(f"[{i}/{len(clients)}] {row['client']} — {status}")
        # A thread stuck inside a Sync call can't be stopped, only abandoned.
        now = time.monotonic()
        for future, name in list(pending.items()):
            started = last_progress.get(name)
            if started is not None and now - started > args.stall_timeout:
                pending.pop(future)
                timed_out.append(name)
                report_rows.append({"client": name, "flag": "TIMED OUT",
                                    **{n: "TIMED OUT" for n in TARGET_FOLDERS}})
                i += 1
                print(f"[{i}/{len(clients)}] {name} — TIMED OUT "
                      f"(no response from Sync for {args.stall_timeout}s)")

    if out_of_space.is_set():
        pool.shutdown(wait=False, cancel_futures=True)
        print(f"\nSTOPPED: under {args.min_free_gb:g} GB free. Copied "
              f"{total_copied} files before stopping. Free up space (or set "
              "Active Clients to online-only in Sync) and re-run the same "
              "command to resume.")
        sys.stdout.flush()
        os._exit(1)

    report_rows.sort(key=lambda r: r["client"].lower())

    missing = [r for r in report_rows if "MISSING" in r["flag"]]
    multiple = [r for r in report_rows if "MULTIPLE" in r["flag"]]

    verb = "Copied" if args.commit else "Would copy"
    print(f"\n{verb} {total_copied} files ({total_skipped} already in export).")
    print(f"{len(clients)} clients, {len(missing)} potentially missing a DOL "
          f"folder, {len(multiple)} with more than one, "
          f"{len(timed_out)} timed out.")
    if timed_out:
        print("Timed out (re-run later with --match): " + "; ".join(timed_out))

    report_path = (dest if args.commit else Path.cwd()) / "export_report.csv"
    if args.commit:
        dest.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w", newline="") as f:
        writer = csv.DictWriter(
            f, fieldnames=["client", "flag", *TARGET_FOLDERS])
        writer.writeheader()
        writer.writerows(report_rows)
    print(f"Report: {report_path}")

    if not args.commit:
        print("\nDry run only. Re-run with --commit to copy.")

    # Abandoned threads may still be blocked inside Sync; don't wait on them.
    sys.stdout.flush()
    os._exit(0)


if __name__ == "__main__":
    main()
