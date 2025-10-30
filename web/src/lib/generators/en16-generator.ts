/**
 * EN-16 Form Generator
 * Converts Python en16_generator.py to TypeScript
 */

import { BaseGenerator } from './base-generator';
import { GeneratorResult } from './types';
import { formatDateMMDDYY, formatDateMMDDYYYY } from './utils/formatters';
import { StandardFonts } from 'pdf-lib';

export interface EN16FormData {
  claimant: string;
  case_id: string;
}

export class EN16Generator extends BaseGenerator {
  constructor() {
    super('en-16.pdf');
  }

  async generate(
    claimant: string,
    caseId: string
  ): Promise<GeneratorResult> {
    const nameParts = claimant.trim().split(' ');
    if (nameParts.length < 2) {
      throw new Error(
        'Claimant name format invalid. Must include at least first and last name.'
      );
    }

    const first = nameParts[0];
    const last = nameParts[nameParts.length - 1];

    // Generate filename
    const currentDate = formatDateMMDDYY();
    const filename = `EN16_${first[0]}.${last}_${currentDate}.pdf`;

    // Load template
    const pdfDoc = await this.loadTemplate();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    // First page: name + case ID
    if (pages.length > 0) {
      const firstPage = pages[0];
      firstPage.setFont(font);
      firstPage.setFontSize(12);

      this.drawText(firstPage, claimant, { x: 355, y: 695, size: 12 });
      this.drawText(firstPage, caseId, { x: 355, y: 710, size: 12 });
    }

    // Middle pages: no overlay (skip)

    // Last page: current date only
    if (pages.length > 0) {
      const lastPage = pages[pages.length - 1];
      lastPage.setFont(font);
      lastPage.setFontSize(12);

      const currentDateFormatted = formatDateMMDDYYYY();
      this.drawText(lastPage, currentDateFormatted, { x: 250, y: 227, size: 12 });
    }

    // Save PDF
    const pdfBytes = await pdfDoc.save();

    return {
      filename,
      pdfBytes: Buffer.from(pdfBytes),
    };
  }
}
