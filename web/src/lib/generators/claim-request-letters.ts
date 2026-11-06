/**
 * Reopen and Reconsideration Request Letters
 *
 * Both are built on the withdrawal letter's template. Its two short
 * paragraphs ("We would like to withdraw their claim for" and "Please call me
 * at ... with any questions.") are whited out and replaced by one paragraph
 * that makes the request, notes any enclosures, and ends with the same
 * "Please call me" line. The signature is a raster baked into the template, so
 * nothing below can move: the paragraph has to fit the three lines the two
 * template paragraphs span.
 */

import { BaseGenerator } from './base-generator';
import { ClientRecord, GeneratorResult } from './types';
import { formatDateMMDDYY } from './utils/formatters';
import { sanitizeForWinAnsi, wrapToWidth } from './utils/text-flow';
import { StandardFonts, rgb } from 'pdf-lib';

interface BaseRequestFormData {
  claimant_name: string;
  case_id: string;
  letter_date: string; // ISO date string "YYYY-MM-DD"
  claimed_condition: string;
}

export interface ReopenFormData extends BaseRequestFormData {
  /** True when supporting documents are merged onto the back of the letter */
  has_enclosures?: boolean;
}

export interface ReconsiderationFormData extends BaseRequestFormData {
  /** Date of the Final Decision being challenged, "YYYY-MM-DD" */
  decision_date: string;
}

/** A problem with what the user typed that they can fix, as opposed to a server fault. */
export class RequestLetterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RequestLetterError';
  }
}

const CLOSING = 'Please call me at 808-772-8329 with any questions.';

const REQUEST_PARAGRAPH = {
  x: 73.7,
  width: 466,
  // Baseline of the template's "We would like to withdraw..." line
  firstBaselineY: 537,
  lineHeight: 13.2,
  // Down to the template's "Please call me..." line, leaving the blank line
  // above "Sincerely," as it was
  maxLines: 3,
  // Covers both template paragraphs, clear of "I am writing..." above and
  // "Sincerely," below
  whiteOut: { x: 70, y: 504, width: 472, height: 44 },
};

/** "YYYY-MM-DD" as "Month D, YYYY", or today when empty */
function longDate(iso: string | undefined): string {
  let date = new Date();
  if (iso) {
    const [y, m, d] = iso.split('-').map(Number);
    date = new Date(y, m - 1, d);
  }
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function cleanCondition(raw: string): string {
  let condition: string;
  try {
    // The letter supplies the sentence's closing period, so drop any typed one.
    condition = sanitizeForWinAnsi(raw || '').trim().replace(/[.,;:\s]+$/, '');
  } catch (error) {
    throw new RequestLetterError(error instanceof Error ? error.message : String(error));
  }
  if (!condition) throw new RequestLetterError('Enter the claimed condition.');
  return condition;
}

abstract class ClaimRequestLetterGenerator<T extends BaseRequestFormData> extends BaseGenerator {
  constructor(private filenamePrefix: string) {
    super('withdraw_letter.pdf');
  }

  /** The paragraph's sentences before the "Please call me" closing */
  protected abstract request(formData: T, condition: string): string;

  async generate(clientRecord: ClientRecord, doctor: string, formData: T): Promise<GeneratorResult> {
    const claimantName = formData.claimant_name || '';
    const caseId = formData.case_id || '';
    const condition = cleanCondition(formData.claimed_condition);

    const nameForFilename = claimantName.replace(/,/g, '').replace(/ /g, '_');
    const filename = `${this.filenamePrefix}_${nameForFilename}_${formatDateMMDDYY()}.pdf`;

    const pdfDoc = await this.loadTemplate();
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    const p = REQUEST_PARAGRAPH;
    const lines = wrapToWidth(`${this.request(formData, condition)} ${CLOSING}`, font, 11, p.width);
    if (lines.length > p.maxLines) {
      throw new RequestLetterError(
        'The claimed condition is too long to fit the letter. Shorten it and generate again.'
      );
    }

    for (const page of pdfDoc.getPages()) {
      page.setFont(font);
      page.setFontSize(11);

      // Same positions as the withdrawal letter
      this.drawText(page, claimantName, { x: 119, y: 709, size: 11 });
      this.drawText(page, caseId, { x: 113, y: 696, size: 11 });
      this.drawText(page, longDate(formData.letter_date), { x: 74, y: 684, size: 11 });

      page.drawRectangle({ ...p.whiteOut, color: rgb(1, 1, 1) });
      lines.forEach((line, i) => {
        this.drawText(page, line, { x: p.x, y: p.firstBaselineY - i * p.lineHeight, size: 11 });
      });
    }

    const pdfBytes = await pdfDoc.save();
    return { filename, pdfBytes: Buffer.from(pdfBytes) };
  }
}

export class ReopenLetterGenerator extends ClaimRequestLetterGenerator<ReopenFormData> {
  constructor() {
    super('Reopen_Letter');
  }

  protected request(formData: ReopenFormData, condition: string): string {
    return (
      `We would like to reopen their claim for ${condition}.` +
      (formData.has_enclosures ? ' Supporting documentation is enclosed.' : '')
    );
  }
}

export class ReconsiderationLetterGenerator extends ClaimRequestLetterGenerator<ReconsiderationFormData> {
  constructor() {
    super('Reconsideration_Request');
  }

  protected request(formData: ReconsiderationFormData, condition: string): string {
    if (!formData.decision_date) {
      throw new RequestLetterError('Enter the date of the Final Decision.');
    }
    return (
      `We respectfully request reconsideration of the Final Decision dated ` +
      `${longDate(formData.decision_date)} on their claim for ${condition}. ` +
      `Enclosed is a letter from their physician in support of this request.`
    );
  }
}
