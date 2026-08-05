/**
 * Drafts the causation letters SWNA sends to a physician for signature.
 *
 * Unlike the PDF generators this emits a .docx, because the letter leaves the office as
 * an editable document the physician reviews and signs rather than a filled form.
 *
 * Which letter is drafted comes from the (condition, doctor) pair the form resolved to a
 * template. Each condition asks for different findings, so each gets its own value
 * mapping below.
 */

import {
  DOCX_MIME,
  fillDocx,
  indefiniteArticle,
  loadDocxTemplate,
} from './docx/docx-template';
import { getLetterTemplate, LetterTemplate } from './docx/letter-templates';
import { DocumentResult } from './types';
import { dateOnlyParts, formatDateMMDDYY } from './utils/formatters';

/** Fields every letter needs, whatever the condition. */
export interface DoctorLetterCommonFields {
  first_mi: string;
  last_name: string;
  sex: 'male' | 'female';
  /** YYYY-MM-DD. Used only when no case ID is known. */
  dob?: string;
  case_id?: string;
  /** YYYY-MM-DD. */
  letter_date: string;
  position: string;
  facility: string;
  facility_abbr: string;
  work_dates: string;
}

/** Chronic silicosis adds the B-read findings. */
export interface ChronicSilicosisFields extends DoctorLetterCommonFields {
  /** YYYY-MM-DD — the date of the B-read, which is also the date of diagnosis. */
  dx_date: string;
  profusion: string;
  impression: string;
}

export type DoctorLetterFormData = ChronicSilicosisFields;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * A date input gives "YYYY-MM-DD", which Date reads as midnight UTC. Formatting that
 * with local accessors lands on the previous day west of Greenwich, so both helpers go
 * through dateOnlyParts, which reads in UTC.
 */
function formatSlashed(value: string): string {
  const parts = dateOnlyParts(value);
  if (!parts) throw new Error(`Unparseable date: ${value}`);
  return `${parts.month}/${parts.day}/${parts.year}`;
}

function formatLongDate(value: string): string {
  const parts = dateOnlyParts(value);
  if (!parts) throw new Error(`Unparseable date: ${value}`);
  return `${MONTHS[Number(parts.month) - 1]} ${Number(parts.day)}, ${parts.year}`;
}

/** Tokens shared by every letter template. */
function commonValues(form: DoctorLetterCommonFields): Record<string, string> {
  const male = form.sex === 'male';
  return {
    FIRST_MI: form.first_mi.trim(),
    LAST_NAME: form.last_name.trim(),
    TITLE: male ? 'Mr.' : 'Ms.',
    PRONOUN_POSS: male ? 'his' : 'her',
    CASE_ID: form.case_id?.trim() ?? '',
    DOB: form.dob ? formatSlashed(form.dob) : '',
    LETTER_DATE: formatLongDate(form.letter_date),
    ARTICLE: indefiniteArticle(form.position),
    POSITION: form.position.trim(),
    FACILITY: form.facility.trim(),
    FACILITY_ABBR: form.facility_abbr.trim(),
    WORK_DATES: form.work_dates.trim(),
  };
}

export class DoctorLetterGenerator {
  async generate(
    templateId: string,
    formData: DoctorLetterFormData
  ): Promise<DocumentResult> {
    const template = getLetterTemplate(templateId);

    let values: Record<string, string>;
    switch (template.conditionId) {
      case 'chronic-silicosis':
        values = {
          ...commonValues(formData),
          DX_DATE: formatSlashed(formData.dx_date),
          PROFUSION: formData.profusion.trim(),
          // The template closes the quotation with its own period, so an impression
          // ending in one would render as `...pneumoconiosis.".`
          IMPRESSION: formData.impression.trim().replace(/\.$/, ''),
        };
        break;
      default:
        throw new Error(`No field mapping for condition: ${template.conditionId}`);
    }

    // DOL identifies a claimant by case ID once one exists; the DOB line is the
    // fallback for a claim that hasn't been assigned one yet. Only one is printed.
    const useCaseId = values.CASE_ID.length > 0;

    const templateBytes = await loadDocxTemplate(template.templateFile);
    const bytes = fillDocx(templateBytes, values, {
      CASE_ID: useCaseId,
      DOB: !useCaseId,
    });

    return {
      filename: buildFilename(template, formData),
      bytes,
      mimeType: DOCX_MIME,
    };
  }
}

function buildFilename(
  template: LetterTemplate,
  form: DoctorLetterCommonFields
): string {
  const name = `${form.first_mi} ${form.last_name}`
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_.-]/g, '');
  return `${template.filenamePrefix}_${name}_${formatDateMMDDYY()}.docx`;
}
