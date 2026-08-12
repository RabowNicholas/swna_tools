/**
 * Registry of the physician causation letters the app can draft.
 *
 * A letter is identified by the pair (condition, doctor) — the same condition may be
 * written to different physicians, and one physician signs letters for several
 * conditions. The form asks for those two, then resolves the pair to a template here.
 *
 * Adding another letter means:
 *   1. extract its letterhead with scripts/build-letterhead.mjs
 *   2. add an entry here
 *   3. if it is a new condition, add its field set to the form, its prose to
 *      DoctorLetterGenerator, and a case to the switch there
 * The flow engine, route, log entry and billing record are all shared.
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
  /** Stable key, `<condition>--<doctor>`. */
  id: string;
  /** Condition the letter establishes causation for. */
  conditionId: string;
  conditionLabel: string;
  /** Physician who signs it. */
  doctorId: string;
  doctorLabel: string;
  /** Short name used in the log entry and billing row, e.g. "CS Letter". */
  chargeLabel: string;
  /** Letterhead PDF under public/templates, drawn on as page 1. */
  templateFile: string;
  /** Flat fee billed for drafting it, in whole dollars. */
  fee: number;
  /** Leading token of the generated filename. */
  filenamePrefix: string;
}

export const LETTER_TEMPLATES: Record<string, LetterTemplate> = {
  'chronic-silicosis--toupin': {
    id: 'chronic-silicosis--toupin',
    conditionId: 'chronic-silicosis',
    conditionLabel: 'Chronic Silicosis',
    doctorId: 'toupin',
    doctorLabel: 'Dr. Toupin',
    chargeLabel: 'CS Letter',
    templateFile: 'chronic-silicosis-toupin-letterhead.pdf',
    fee: 200,
    filenamePrefix: 'CS_Letter_Toupin',
  },
};

const ALL = Object.values(LETTER_TEMPLATES);

/** Distinct conditions that have at least one template, for the first dropdown. */
export function letterConditions(): { id: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const t of ALL) seen.set(t.conditionId, t.conditionLabel);
  return [...seen].map(([id, label]) => ({ id, label }));
}

/** Doctors who sign the given condition, for the second dropdown. */
export function doctorsForCondition(
  conditionId: string
): { id: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const t of ALL) {
    if (t.conditionId === conditionId) seen.set(t.doctorId, t.doctorLabel);
  }
  return [...seen].map(([id, label]) => ({ id, label }));
}

/** The template for a (condition, doctor) pair, or null if that pair has none. */
export function findLetterTemplate(
  conditionId: string,
  doctorId: string
): LetterTemplate | null {
  return (
    ALL.find((t) => t.conditionId === conditionId && t.doctorId === doctorId) ??
    null
  );
}

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
  return `$${template.fee} ${template.chargeLabel} for ${template.doctorLabel}`;
}
