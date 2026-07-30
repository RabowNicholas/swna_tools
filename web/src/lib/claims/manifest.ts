/**
 * What goes in a claim, in what order.
 *
 * Claim type plus condition fully determines the contents of an assembled
 * claim and the order they're stacked in. That rule set lives here as data so
 * it's applied the same way every time, rather than re-derived per assembler.
 *
 * Primary claims only for now — CQ, survivorship and blind-file each change
 * the document set in ways this doesn't cover yet.
 */

/** Drives which documents a claim needs. */
export type ConditionCategory =
  | 'chronic_silicosis'
  | 'pneumoconiosis'
  | 'cancer'
  | 'other';

export interface Condition {
  /** Stable id used by the form control */
  id: string;
  /** Name as the team says it */
  label: string;
  /** Short form used in the claim filename, e.g. "CS" */
  abbreviation: string;
  category: ConditionCategory;
}

/**
 * Conditions currently claimed, seeded from what's in "3 - CLAIMS to Assemble".
 * "Other" takes a typed abbreviation for anything not listed.
 */
export const CONDITIONS: Condition[] = [
  { id: 'chronic_silicosis', label: 'Chronic Silicosis', abbreviation: 'CS', category: 'chronic_silicosis' },
  { id: 'pneumoconiosis', label: 'Pneumoconiosis', abbreviation: 'PN', category: 'pneumoconiosis' },
  { id: 'work_related_asthma', label: 'Work-Related Asthma', abbreviation: 'OA', category: 'other' },
  { id: 'copd', label: 'COPD', abbreviation: 'COPD', category: 'other' },
  { id: 'pulmonary_fibrosis', label: 'Pulmonary Fibrosis', abbreviation: 'PF', category: 'other' },
  { id: 'restrictive_lung_disease', label: 'Restrictive Lung Disease', abbreviation: 'RLD', category: 'other' },
  { id: 'cancer', label: 'Cancer', abbreviation: 'CA', category: 'cancer' },
  { id: 'other', label: 'Other (enter abbreviation)', abbreviation: '', category: 'other' },
];

export const getCondition = (id: string): Condition | undefined =>
  CONDITIONS.find((c) => c.id === id);

/**
 * Where a slot's PDF comes from: a bundled blank, a form this app fills out,
 * or a file the assembler supplies.
 */
export type SlotSource = 'template' | 'generated' | 'upload';

/** The generators a claim can drive, keyed to /api/generate/<id>. */
export type SlotGenerator = 'ee1' | 'ee3';

export interface DocumentSlot {
  id: string;
  label: string;
  source: SlotSource;
  required: boolean;
  /** Shown under the slot — the reason it is or isn't here */
  hint?: string;
  /** Only set for template slots */
  templatePath?: string;
  /** Only set for generated slots */
  generator?: SlotGenerator;
}

export const COVER_SHEET_PATH = '/templates/claim_form_cover_sheet.pdf';

export interface ManifestOptions {
  /**
   * False when a claim was already submitted for this client — by us or a
   * previous AR — in which case no new EE-3 is filed.
   */
  needsEE3: boolean;
}

/**
 * The documents a primary claim needs, in assembly order.
 *
 * Cover sheet and AR form open every claim; the EE-1 and (for a first-ever
 * claim) the EE-3 follow; the medical evidence closes it out and is the only
 * part that varies by condition.
 */
export function requiredDocuments(
  category: ConditionCategory,
  { needsEE3 }: ManifestOptions
): DocumentSlot[] {
  const slots: DocumentSlot[] = [
    {
      id: 'cover_sheet',
      label: 'Claim Form Cover Sheet',
      source: 'template',
      required: true,
      templatePath: COVER_SHEET_PATH,
      hint: 'Required on every claim and always first. Added automatically.',
    },
    {
      id: 'ar_form',
      label: 'AR Form',
      source: 'upload',
      required: true,
      hint: 'Check it carries the current work address, and that any older form has no DOL stamp.',
    },
    {
      id: 'ee1',
      label: 'EE-1',
      source: 'generated',
      generator: 'ee1',
      required: true,
      hint: 'Built from the claim details below, with the signature if one was supplied.',
    },
  ];

  if (needsEE3) {
    slots.push({
      id: 'ee3',
      label: 'EE-3',
      source: 'generated',
      generator: 'ee3',
      required: true,
      hint: 'Built from the employment history below. Only for clients who have never had a claim submitted, by us or a previous AR.',
    });
  }

  return [...slots, ...medicalEvidence(category)];
}

/** The medical evidence a category calls for — the part that actually varies. */
function medicalEvidence(category: ConditionCategory): DocumentSlot[] {
  if (category === 'cancer') {
    return [
      {
        id: 'pathology',
        label: 'Pathology Report',
        source: 'upload',
        required: true,
        hint: 'Cancer claims are supported by pathology and do not need a diagnosis letter.',
      },
    ];
  }

  const dxLetter: DocumentSlot = {
    id: 'dx_letter',
    label: 'Diagnosis Letter',
    source: 'upload',
    required: true,
    hint: 'Confirm a doctor signed it before assembling.',
  };

  // CS and PN are diagnosed off the B-read, which is always attached to the
  // diagnosis letter — one document, so one slot.
  if (category === 'chronic_silicosis' || category === 'pneumoconiosis') {
    return [
      {
        ...dxLetter,
        label: 'Diagnosis Letter (B-Read attached)',
        hint: 'Confirm a doctor signed it, and check the DOB and SSN on the attached B-read. No other medical records are needed for this condition.',
      },
    ];
  }

  return [
    dxLetter,
    {
      id: 'medical_records',
      label: 'Supporting Medical Records',
      source: 'upload',
      required: true,
      hint: 'Everything used to make the diagnosis — e.g. for asthma: PFT, OAA, and follow-up visit notes.',
    },
  ];
}

export interface ClaimNameParts {
  conditionAbbr: string;
  firstName: string;
  lastName: string;
  /** Defaults to today */
  date?: Date;
}

/**
 * The assembled claim's filename, e.g. "EEOIC Claim CS F. Last 12.05.23".
 */
export function claimFileName({
  conditionAbbr,
  firstName,
  lastName,
  date = new Date(),
}: ClaimNameParts): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);

  const initial = firstName.trim().charAt(0).toUpperCase();
  const surname = lastName.trim();
  const condition = conditionAbbr.trim();

  return `EEOIC Claim ${condition} ${initial}. ${surname} ${mm}.${dd}.${yy}`;
}
