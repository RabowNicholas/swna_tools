/**
 * Withdrawal Letter Generator
 * Converts Python withdrawal_letter_generator.py to TypeScript
 */

import { BaseGenerator } from './base-generator';
import { ClientRecord, GeneratorResult } from './types';
import { formatDateMMDDYY } from './utils/formatters';
import { StandardFonts } from 'pdf-lib';

export interface WithdrawalFormData {
  claimant_name: string;
  case_id: string;
  letter_date: string; // ISO date string "YYYY-MM-DD"
  claimed_condition: string;
}

export class WithdrawalLetterGenerator extends BaseGenerator {
  constructor() {
    super('withdraw_letter.pdf');
  }

  async generate(
    clientRecord: ClientRecord,
    doctor: string,
    formData: WithdrawalFormData
  ): Promise<GeneratorResult> {
    const claimantName = formData.claimant_name || '';
    const caseId = formData.case_id || '';
    const letterDate = formData.letter_date;
    const claimedCondition = formData.claimed_condition || '';

    // Format the letter date as "Month DD, YYYY"
    let formattedDate: string;
    if (letterDate) {
      const dateObj = new Date(letterDate);
      const month = dateObj.toLocaleDateString('en-US', { month: 'long' });
      const day = dateObj.getDate();
      const year = dateObj.getFullYear();
      formattedDate = `${month} ${day}, ${year}`;
    } else {
      const now = new Date();
      const month = now.toLocaleDateString('en-US', { month: 'long' });
      const day = now.getDate();
      const year = now.getFullYear();
      formattedDate = `${month} ${day}, ${year}`;
    }

    // Generate filename
    const currentDate = formatDateMMDDYY();
    const nameForFilename = claimantName.replace(/,/g, '').replace(/ /g, '_');
    const filename = `Withdrawal_Letter_${nameForFilename}_${currentDate}.pdf`;

    // Load template and generate PDF
    const pdfDoc = await this.loadTemplate();

    // Get Times-Roman font
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    // Process all pages (template may be multi-page)
    const pages = pdfDoc.getPages();

    for (const page of pages) {
      page.setFont(font);
      page.setFontSize(11);

      // Fill in the template fields based on the letter template structure
      // Claimant name at top
      this.drawText(page, claimantName, { x: 119, y: 709, size: 11 });

      // Case ID
      this.drawText(page, caseId, { x: 113, y: 696, size: 11 });

      // Date
      this.drawText(page, formattedDate, { x: 74, y: 684, size: 11 });

      // Claimed condition (with period)
      this.drawText(page, `${claimedCondition}.`, { x: 260, y: 537, size: 11 });
    }

    // Save PDF to bytes
    const pdfBytes = await pdfDoc.save();

    return {
      filename,
      pdfBytes: Buffer.from(pdfBytes),
    };
  }
}
