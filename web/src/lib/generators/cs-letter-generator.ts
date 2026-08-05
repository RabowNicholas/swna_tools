/**
 * Drafts the Chronic Silicosis causation letter that Dr. Toupin signs, from the B-read
 * returned by the radiologist.
 *
 * Unlike the PDF generators this emits a .docx, because the letter leaves the office as
 * an editable document the physician reviews and signs rather than a filled form.
 */

import {
  DOCX_MIME,
  fillDocx,
  indefiniteArticle,
  loadDocxTemplate,
} from './docx/docx-template';
import { getLetterTemplate } from './docx/letter-templates';
import { DocumentResult } from './types';
import { dateOnlyParts, formatDateMMDDYY } from './utils/formatters';

export interface CSLetterFormData {
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
  /** YYYY-MM-DD — the date of the B-read, which is also the date of diagnosis. */
  dx_date: string;
  profusion: string;
  impression: string;
}

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

export class CSLetterGenerator {
  private templateId = 'cs-letter';

  async generate(formData: CSLetterFormData): Promise<DocumentResult> {
    const template = getLetterTemplate(this.templateId);
    const templateBytes = await loadDocxTemplate(template.templateFile);

    const male = formData.sex === 'male';
    const caseId = formData.case_id?.trim() ?? '';
    // DOL identifies a claimant by case ID once one exists; the DOB line is the
    // fallback for a claim that hasn't been assigned one yet. Only one is printed.
    const useCaseId = caseId.length > 0;

    const values: Record<string, string> = {
      FIRST_MI: formData.first_mi.trim(),
      LAST_NAME: formData.last_name.trim(),
      TITLE: male ? 'Mr.' : 'Ms.',
      PRONOUN_POSS: male ? 'his' : 'her',
      CASE_ID: caseId,
      DOB: formData.dob ? formatSlashed(formData.dob) : '',
      LETTER_DATE: formatLongDate(formData.letter_date),
      ARTICLE: indefiniteArticle(formData.position),
      POSITION: formData.position.trim(),
      FACILITY: formData.facility.trim(),
      FACILITY_ABBR: formData.facility_abbr.trim(),
      WORK_DATES: formData.work_dates.trim(),
      DX_DATE: formatSlashed(formData.dx_date),
      PROFUSION: formData.profusion.trim(),
      // The template closes the quotation with its own period, so an impression ending
      // in one would render as `...pneumoconiosis.".`
      IMPRESSION: formData.impression.trim().replace(/\.$/, ''),
    };

    const bytes = fillDocx(templateBytes, values, {
      CASE_ID: useCaseId,
      DOB: !useCaseId,
    });

    const name = `${formData.first_mi} ${formData.last_name}`
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^A-Za-z0-9_.-]/g, '');

    return {
      filename: `${template.filenamePrefix}_${name}_${formatDateMMDDYY()}.docx`,
      bytes,
      mimeType: DOCX_MIME,
    };
  }
}
