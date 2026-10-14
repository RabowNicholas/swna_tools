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
  'ir-notice': { doc: 'IR Notice', subfolder: SUBMITTED_DOL },
  'change-of-ar': { doc: 'Change of AR', subfolder: SUBMITTED_DOL },
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
