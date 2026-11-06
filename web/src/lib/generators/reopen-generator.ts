/**
 * Reopen Claim Letter Generator
 *
 * Built on the withdrawal letter's template: the same letter with its
 * "We would like to withdraw their claim for" sentence replaced by a request
 * to reopen the claim.
 */

import { BaseGenerator } from './base-generator';
import { ClientRecord, GeneratorResult } from './types';
import { formatDateMMDDYY } from './utils/formatters';
import { sanitizeForWinAnsi, wrapToWidth } from './utils/text-flow';
import { StandardFonts, rgb } from 'pdf-lib';

export interface ReopenFormData {
  claimant_name: string;
  case_id: string;
  letter_date: string; // ISO date string "YYYY-MM-DD"
  claimed_condition: string;
}

/** A problem with the typed condition the user can fix, as opposed to a server fault. */
export class ReopenConditionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReopenConditionError';
  }
}

// The template's request sentence is one line of Times 11pt with "Please call
// me..." right below it, so the replacement has to fit the same line.
const REQUEST_SENTENCE = {
  x: 73.7,
  width: 466,
  firstBaselineY: 537,
  lineHeight: 13.2,
  maxLines: 1,
  // Covers the template's "We would like to withdraw their claim for", clear
  // of the paragraph above and the "Please call me..." line below.
  whiteOut: { x: 70, y: 531, width: 192, height: 16 },
};

export class ReopenLetterGenerator extends BaseGenerator {
  constructor() {
    super('withdraw_letter.pdf');
  }

  async generate(
    clientRecord: ClientRecord,
    doctor: string,
    formData: ReopenFormData
  ): Promise<GeneratorResult> {
    const claimantName = formData.claimant_name || '';
    const caseId = formData.case_id || '';
    const letterDate = formData.letter_date;

    // The generator supplies the sentence's closing period, so drop any typed one.
    let claimedCondition: string;
    try {
      claimedCondition = sanitizeForWinAnsi(formData.claimed_condition || '')
        .trim()
        .replace(/[.,;:\s]+$/, '');
    } catch (error) {
      throw new ReopenConditionError(error instanceof Error ? error.message : String(error));
    }
    if (!claimedCondition) {
      throw new ReopenConditionError('Enter the condition whose claim is being reopened.');
    }

    // Format the letter date as "Month DD, YYYY"
    const dateObj = letterDate ? new Date(letterDate) : new Date();
    const formattedDate = `${dateObj.toLocaleDateString('en-US', { month: 'long' })} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;

    // Generate filename
    const currentDate = formatDateMMDDYY();
    const nameForFilename = claimantName.replace(/,/g, '').replace(/ /g, '_');
    const filename = `Reopen_Letter_${nameForFilename}_${currentDate}.pdf`;

    const pdfDoc = await this.loadTemplate();
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    const s = REQUEST_SENTENCE;
    const lines = wrapToWidth(
      `We would like to reopen their claim for ${claimedCondition}.`,
      font,
      11,
      s.width
    );
    if (lines.length > s.maxLines) {
      throw new ReopenConditionError(
        'The claimed condition is too long to fit the letter. Shorten it and generate again.'
      );
    }

    const pages = pdfDoc.getPages();
    for (const page of pages) {
      page.setFont(font);
      page.setFontSize(11);

      // Same positions as the withdrawal letter
      this.drawText(page, claimantName, { x: 119, y: 709, size: 11 });
      this.drawText(page, caseId, { x: 113, y: 696, size: 11 });
      this.drawText(page, formattedDate, { x: 74, y: 684, size: 11 });

      page.drawRectangle({ ...s.whiteOut, color: rgb(1, 1, 1) });
      lines.forEach((line, i) => {
        this.drawText(page, line, {
          x: s.x,
          y: s.firstBaselineY - i * s.lineHeight,
          size: 11,
        });
      });
    }

    const pdfBytes = await pdfDoc.save();
    return {
      filename,
      pdfBytes: Buffer.from(pdfBytes),
    };
  }
}
