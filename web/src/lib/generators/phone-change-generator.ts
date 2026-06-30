/**
 * Phone Change Generator
 * Mirrors address-change-generator.ts, adapted for a phone number change letter
 */

import { BaseGenerator } from './base-generator';
import { ClientRecord, GeneratorResult } from './types';
import { formatDateMMDDYY } from './utils/formatters';
import { StandardFonts } from 'pdf-lib';

export interface PhoneChangeFormData {
  claimant_name: string;
  case_id: string;
  phone_number: string;
}

export class PhoneChangeGenerator extends BaseGenerator {
  constructor() {
    super('Phone Change Template.pdf');
  }

  async generate(
    clientRecord: ClientRecord,
    doctor: string,
    formData: PhoneChangeFormData
  ): Promise<GeneratorResult> {
    const claimantName = formData.claimant_name || '';
    const caseId = formData.case_id || '';
    const phoneNumber = formData.phone_number || '';

    // Generate filename
    const currentDate = formatDateMMDDYY();
    const nameForFilename = claimantName.replace(/,/g, '').replace(/ /g, '_');
    const filename = `Phone_Change_${nameForFilename}_${currentDate}.pdf`;

    // Load template and generate PDF
    const pdfDoc = await this.loadTemplate();

    // Get Times-Roman font
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    // Process all pages
    const pages = pdfDoc.getPages();

    // Format current date as "Month DD, YYYY"
    const now = new Date();
    const month = now.toLocaleDateString('en-US', { month: 'long' });
    const day = now.getDate();
    const year = now.getFullYear();
    const formattedCurrentDate = `${month} ${day}, ${year}`;

    for (const page of pages) {
      page.setFont(font);
      page.setFontSize(11);

      // Fill in the template fields based on the phone change template structure.
      // NOTE: these coordinates mirror the address-change template and likely
      // need tuning once the real Phone Change Template.pdf is in place.

      // Claimant name at top
      this.drawText(page, claimantName, { x: 116, y: 721, size: 11 });

      // Case ID
      this.drawText(page, caseId, { x: 110, y: 708, size: 11 });

      // Current date below case ID
      this.drawText(page, formattedCurrentDate, { x: 72, y: 695, size: 11 });

      // New phone number (middle section)
      this.drawText(page, phoneNumber, { x: 112, y: 540, size: 11 });

      // Replace "Mr. X" with the actual claimant first name in the letter text
      const firstName = claimantName.split(' ')[0] || '';
      this.drawText(page, firstName, { x: 620, y: 453, size: 11 });
    }

    // Save PDF to bytes
    const pdfBytes = await pdfDoc.save();

    return {
      filename,
      pdfBytes: Buffer.from(pdfBytes),
    };
  }
}
