// The next invoice number for a client, from what's already in their BILLING
// folder. Invoices are numbered per client: the first is 1, the second 2.
// Older invoices have no number in the name ("Invoice Part B $150k …"), so
// the count of real invoices is what matters; a numbered one ("Invoice 2 …",
// "Invoice #4 …", "Invoice Part E #2 …") can push it higher.

import { BILLING } from './destinations';
import { getSyncState, type DirHandle } from './sync-folder';
import { findClientFolder } from './save-to-client';

/** Blank templates copied into every BILLING folder; never a real invoice */
const TEMPLATES = [
  /^(aa )?NEW INVOICE w-Gratuity Line/i,
  /^NEWEST - PART B INVOICE w-credit card option/i,
  /^INVOICE - With Latest Address/i,
];

/** Sync conflict copies, "- Copy" duplicates and " (2)" re-saves of the same invoice */
const DUPLICATES = /-CONFLICT-\d+|\s-\sCopy\b|\s\(\d+\)\.xlsx$/i;

/** True for a real invoice spreadsheet. PDFs are exports of one, so they don't count. */
export function isInvoiceFile(name: string): boolean {
  if (!/\.xlsx$/i.test(name) || !/invoice/i.test(name)) return false;
  if (TEMPLATES.some((t) => t.test(name))) return false;
  return !DUPLICATES.test(name);
}

/** The number written in the name, e.g. 4 from "Invoice #4 Part E …", else null */
export function invoiceNumberIn(name: string): number | null {
  const m = name.match(/^Invoice\s+#?(\d{1,2})\s/i) ?? name.match(/\bPart [BE&]+\s+#(\d{1,2})\b/i);
  return m ? parseInt(m[1], 10) : null;
}

export interface NextInvoice {
  next: number;
  /** How many real invoices are already there */
  count: number;
}

/** Pure, so it can be checked against a plain list of file names */
export function nextInvoiceNumber(fileNames: string[]): NextInvoice {
  const invoices = fileNames.filter(isInvoiceFile);
  // The same invoice saved again with its number added counts once:
  // "Invoice Part B $150k S. Pennock 9.8.25" and "Invoice #1 Part B $150k S. Pennock 9.8.25"
  const count = new Set(
    invoices.map((n) => n.replace(/^Invoice\s+#?\d{1,2}\s/i, 'Invoice ').replace(/\s+/g, ' ').toLowerCase())
  ).size;
  const highest = Math.max(0, ...invoices.map((n) => invoiceNumberIn(n) ?? 0));
  return { next: Math.max(count, highest) + 1, count };
}

/**
 * Reads the client's BILLING folder through the Sync folder. Null when Sync
 * isn't set up or allowed in this browser, or the client's folder can't be
 * told apart; never asks the user for anything. A missing BILLING folder means
 * no invoices yet.
 */
export async function nextInvoiceForClient(airtableName: string): Promise<NextInvoice | null> {
  const sync = await getSyncState();
  if (sync.status !== 'ready' || !sync.activeClients) return null;
  const match = await findClientFolder(sync.activeClients, airtableName);
  if (!match.folder) return null;
  const clientDir = await sync.activeClients.getDirectoryHandle(match.folder);
  let billing: DirHandle;
  try {
    billing = (await clientDir.getDirectoryHandle(BILLING)) as DirHandle;
  } catch {
    return nextInvoiceNumber([]);
  }
  const names: string[] = [];
  for await (const entry of billing.values()) {
    if (entry.kind === 'file') names.push(entry.name);
  }
  return nextInvoiceNumber(names);
}
