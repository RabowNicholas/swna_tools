// Where each tool's file goes in the client's folder, and what it's called.
// Unsigned forms the client still has to sign go in the client's main folder;
// anything sent to DOL goes in "Submitted DOL".

import { nameAndDate } from '@/lib/claims/manifest';

export const SUBMITTED_DOL = 'Submitted DOL';
export const BILLING = 'BILLING';

export interface Destination {
  /** What the file is, as it starts the file name, e.g. "IR Notice" */
  doc: string;
  /** Subfolder inside the client's folder; '' is the client's main folder */
  subfolder: string;
}

export const DESTINATIONS = {
  // Forms the client still signs, and letters that go to a doctor
  ee1: { doc: 'EE-1', subfolder: '' },
  ee1a: { doc: 'EE-1a', subfolder: '' },
  ee3: { doc: 'EE-3', subfolder: '' },
  'claim-form': { doc: 'Claim form', subfolder: '' },
  'doctor-letter': { doc: 'Doctor Letter', subfolder: '' },
  'desert-pulm': { doc: 'Desert Pulm Referral', subfolder: '' },

  // Sent to DOL
  'ir-notice': { doc: 'IR Notice', subfolder: SUBMITTED_DOL },
  'change-of-ar': { doc: 'Change of AR', subfolder: SUBMITTED_DOL },
  ee10: { doc: 'EE-10', subfolder: SUBMITTED_DOL },
  en16: { doc: 'EN-16', subfolder: SUBMITTED_DOL },
  'rd-waiver': { doc: 'RD Waiver', subfolder: SUBMITTED_DOL },
  withdrawal: { doc: 'Withdrawal Letter', subfolder: SUBMITTED_DOL },
  'dol-letter': { doc: 'DOL Letter', subfolder: SUBMITTED_DOL },
  'dol-status-update': { doc: 'DOL Status Update', subfolder: SUBMITTED_DOL },
  'phone-change': { doc: 'Phone Change', subfolder: SUBMITTED_DOL },
  'address-change': { doc: 'Address Change', subfolder: SUBMITTED_DOL },
  'claim-packet': { doc: 'EEOIC Claim', subfolder: SUBMITTED_DOL },

  invoice: { doc: 'Invoice', subfolder: BILLING },
} satisfies Record<string, Destination>;

export type DestinationId = keyof typeof DESTINATIONS;

/**
 * "IR Notice B. White 10.14.26.pdf" from the Airtable Name
 * "White, Bryan K - 1234".
 */
export function fileNameFor(
  doc: string,
  airtableName: string,
  ext = 'pdf',
  date = new Date()
): string {
  const [last, rest = ''] = airtableName.split(/\s+-\s+/)[0].split(',', 2);
  const first = rest.trim().split(/\s+/)[0] ?? '';
  return `${doc} ${nameAndDate(first, last, date)}.${ext}`;
}
