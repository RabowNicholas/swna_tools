// What a client's BILLING folder says about their next invoice: its number,
// and which services are already on an earlier invoice. Invoices are numbered per client: the first is 1, the second 2.
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

/** A physician service already on one of the client's invoices */
export interface BilledItem {
  name: string;
  /** YYYY-MM-DD */
  date: string;
  /** The invoice it's on */
  invoice: string;
}

/** "Physician File Review - Dr. Toupin" on 2026-01-12, as one comparable key */
export function itemKey(name: string, date: string): string {
  return `${name.trim().replace(/\s+/g, ' ').toLowerCase()}|${date}`;
}

/**
 * A date cell as YYYY-MM-DD. The app writes "2026-01-12"; invoices made by
 * hand hold real dates or "1/12/26". Null for anything that isn't a date.
 */
export function cellDate(value: unknown): string | null {
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value !== 'string') return null;
  const iso = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = value.trim().match(/^(\d{1,2})[./](\d{1,2})[./](\d{2}|\d{4})$/);
  if (!us) return null;
  const year = us[3].length === 2 ? `20${us[3]}` : us[3];
  return `${year}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`;
}

/** Any spreadsheet row, as its first column's text and the other cells' values */
export interface SheetRow {
  label: string;
  values: unknown[];
}

/**
 * The services listed on one invoice: the rows under the "Physician Service"
 * header that have a name and a date, up to the thank-you lines at the bottom,
 * or the one-line "… dated 8/16/2020" rows of older invoices.
 */
export function itemsOnInvoice(rows: SheetRow[], invoice: string): BilledItem[] {
  const items: BilledItem[] = [];
  // The 2020-era layout writes each service as one line:
  // "$200.00 Physician File Review - Dr. Herold dated 8/16/2020"
  for (const row of rows) {
    const m = row.label.match(/^\s*(?:-?\$[\d,.]+\s+)?(.+?)\s+dated\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s*$/i);
    const date = m && cellDate(m[2]);
    if (m && date && !/award/i.test(m[1])) items.push({ name: m[1].trim(), date, invoice });
  }
  const start = rows.findIndex((r) => r.label.trim().toLowerCase() === 'physician service');
  if (start < 0) return items;
  for (const row of rows.slice(start + 1)) {
    if (/^we appreciate/i.test(row.label.trim())) break;
    if (!row.label.trim()) continue;
    const date = row.values.map(cellDate).find((d): d is string => d !== null);
    if (date) items.push({ name: row.label.trim(), date, invoice });
  }
  return items;
}

async function readInvoice(file: File): Promise<SheetRow[]> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const rows: SheetRow[] = [];
  sheet.eachRow((row) => {
    const values: unknown[] = [];
    for (let c = 2; c <= 6; c++) values.push(row.getCell(c).value);
    rows.push({ label: row.getCell(1).text ?? '', values });
  });
  return rows;
}

export interface BillingFolder extends NextInvoice {
  /** Every service already on an invoice there */
  billed: BilledItem[];
  /** Invoices that couldn't be opened, so their items couldn't be checked */
  unreadable: string[];
}

/**
 * Reads the client's BILLING folder through the Sync folder: the next invoice
 * number and every service already billed. Null when Sync isn't set up or
 * allowed in this browser, or the client's folder can't be told apart; never
 * asks the user for anything. A missing BILLING folder means no invoices yet.
 */
export async function readBillingFolder(airtableName: string): Promise<BillingFolder | null> {
  const sync = await getSyncState();
  if (sync.status !== 'ready' || !sync.activeClients) return null;
  const match = await findClientFolder(sync.activeClients, airtableName);
  if (!match.folder) return null;
  const clientDir = await sync.activeClients.getDirectoryHandle(match.folder);
  let billing: DirHandle;
  try {
    billing = (await clientDir.getDirectoryHandle(BILLING)) as DirHandle;
  } catch {
    return { ...nextInvoiceNumber([]), billed: [], unreadable: [] };
  }
  const files: FileSystemFileHandle[] = [];
  for await (const entry of billing.values()) {
    if (entry.kind === 'file') files.push(entry as FileSystemFileHandle);
  }
  const billed: BilledItem[] = [];
  const unreadable: string[] = [];
  await Promise.all(
    files
      .filter((f) => isInvoiceFile(f.name))
      .map(async (f) => {
        try {
          billed.push(...itemsOnInvoice(await readInvoice(await f.getFile()), f.name));
        } catch {
          unreadable.push(f.name);
        }
      })
  );
  return { ...nextInvoiceNumber(files.map((f) => f.name)), billed, unreadable };
}
