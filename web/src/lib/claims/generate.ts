/**
 * Building an EE-1 or EE-3 from the browser.
 *
 * The generators run on the server — they need the blank templates and sharp
 * for signature ink isolation — so these post the collected fields to the
 * existing /api/generate routes and hand back the PDF bytes. What goes over
 * the wire is form data plus at most one signature image, well under Vercel's
 * 4.5MB body cap; the claimant's medical records stay in the browser and are
 * merged there.
 *
 * The routes disagree on request encoding — the EE-1's accepts multipart so it
 * can carry the signature file — which is the reason this lives in one place.
 */

import { AssemblyError } from './assemble';
import type { DiagnosisCategories } from '@/components/form/DiagnosisCategories';
import type { EmploymentRecord } from '@/components/form/EmploymentHistory';

/** Airtable client record, passed through to the generator untouched. */
export type ClientRecord = { id: string; fields: Record<string, unknown> };

/** SSN as the generators want it: 123-45-6789. */
export const formatSSN = (digits: string): string =>
  `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;

export interface EE1GeneratorFields {
  first_name: string;
  middle_initial: string;
  last_name: string;
  /** Already dashed — use formatSSN */
  ssn: string;
  /** YYYY-MM-DD */
  dob: string;
  sex: 'Male' | 'Female';
  address_main: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  phone: string;
  diagnosis_categories: DiagnosisCategories;
}

export interface EE3GeneratorFields {
  first_name: string;
  middle_name?: string;
  last_name: string;
  former_name?: string;
  /** Already dashed — use formatSSN */
  ssn: string;
  employment_history: EmploymentRecord[];
}

/**
 * A generate route answered with something other than a PDF.
 *
 * Reads the route's JSON error when there is one, and falls back to the
 * session-expired explanation for the HTML login page an expired session gets
 * redirected to.
 */
async function describeFailure(
  response: Response,
  label: string
): Promise<string> {
  try {
    const body = await response.json();
    if (body?.error) {
      return `${label}: ${body.message || body.error}`;
    }
  } catch {
    // Not JSON — most likely the login page
  }

  if (response.status === 401) {
    return `Could not generate the ${label}. Your session may have expired — refresh the page and try again.`;
  }

  return `Could not generate the ${label}. Please try again.`;
}

async function requestPdf(
  url: string,
  init: RequestInit,
  slotId: string,
  label: string
): Promise<ArrayBuffer> {
  const response = await fetch(url, init);

  const isPdf = response.headers.get('content-type')?.includes('pdf');
  if (!response.ok || !isPdf) {
    throw new AssemblyError(await describeFailure(response, label), slotId);
  }

  return response.arrayBuffer();
}

/** The EE-1 route takes multipart so the signature image can ride along. */
export async function generateEE1(
  clientRecord: ClientRecord,
  fields: EE1GeneratorFields,
  signatureFile?: File | null,
  slotId = 'ee1'
): Promise<ArrayBuffer> {
  const body = new FormData();
  body.append('client_record', JSON.stringify(clientRecord));
  body.append('form_data', JSON.stringify(fields));
  if (signatureFile) {
    body.append('signature_file', signatureFile);
  }

  return requestPdf('/api/generate/ee1', { method: 'POST', body }, slotId, 'EE-1');
}

/** The EE-3 carries SWNA's baked-in signature, so plain JSON is enough. */
export async function generateEE3(
  clientRecord: ClientRecord,
  fields: EE3GeneratorFields,
  slotId = 'ee3'
): Promise<ArrayBuffer> {
  // An employment record with no end date is a current position; the
  // generator reads null as "Present" rather than an empty string.
  const form_data = {
    ...fields,
    employment_history: fields.employment_history.map((job) => ({
      ...job,
      start_date: job.start_date
        ? new Date(job.start_date).toISOString().split('T')[0]
        : null,
      end_date: job.end_date
        ? new Date(job.end_date).toISOString().split('T')[0]
        : null,
    })),
  };

  return requestPdf(
    '/api/generate/ee3',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_record: clientRecord, form_data }),
    },
    slotId,
    'EE-3'
  );
}
