/**
 * Registry of the physician causation letters the app can draft.
 *
 * Adding another letter (Pulmonary Fibrosis, CS+AB Combo, ...) means:
 *   1. tokenize its .docx with scripts/build-cs-template.mjs
 *   2. add an entry here
 *   3. add a form page
 * The docx engine, generator, route, log entry and billing record are all shared.
 */

/** ILO profusion readings, in the order they appear on a B-read form. */
export const ILO_PROFUSIONS = [
  '0/-',
  '0/0',
  '0/1',
  '1/0',
  '1/1',
  '1/2',
  '2/1',
  '2/2',
  '2/3',
  '3/2',
  '3/3',
  '3/+',
] as const;

export interface LetterTemplate {
  /** Tool id — also the route segment under /forms and /api/generate. */
  id: string;
  /** Human label, used in the UI and in the Airtable log entry. */
  label: string;
  /** Filename under public/templates. */
  templateFile: string;
  /** Physician who signs the letter. */
  signedBy: string;
  /** Flat fee billed for drafting it, in whole dollars. */
  fee: number;
  /** Leading token of the generated filename. */
  filenamePrefix: string;
}

export const LETTER_TEMPLATES: Record<string, LetterTemplate> = {
  'cs-letter': {
    id: 'cs-letter',
    label: 'CS Letter',
    templateFile: 'chronic-silicosis-toupin.docx',
    signedBy: 'Dr. Toupin',
    fee: 200,
    filenamePrefix: 'CS_Letter_Toupin',
  },
};

export function getLetterTemplate(id: string): LetterTemplate {
  const template = LETTER_TEMPLATES[id];
  if (!template) {
    throw new Error(`Unknown letter template: ${id}`);
  }
  return template;
}

/**
 * The billing/log description. Both the client's Log entry and the Invoicing row use
 * this same phrasing so a reader can match one to the other at a glance.
 *
 * e.g. "$200 CS Letter for Dr. Toupin"
 */
export function letterChargeDescription(template: LetterTemplate): string {
  return `$${template.fee} ${template.label} for ${template.signedBy}`;
}
