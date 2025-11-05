/**
 * Address Change Generator
 * Direct port from Python address_change_generator.py to TypeScript
 */

import { BaseGenerator } from './base-generator';
import { ClientRecord, GeneratorResult } from './types';
import { formatDateMMDDYY } from './utils/formatters';
import { StandardFonts } from 'pdf-lib';

export interface AddressChangeFormData {
  claimant_name: string;
  case_id: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
}

export class AddressChangeGenerator extends BaseGenerator {
  constructor() {
    super('Address Change Template.pdf');
  }

  async generate(
    clientRecord: ClientRecord,
    formData: AddressChangeFormData
  ): Promise<GeneratorResult> {
    const claimantName = formData.claimant_name || '';
    const caseId = formData.case_id || '';
    const streetAddress = formData.street_address || '';
    const city = formData.city || '';
    const state = formData.state || '';
    const zipCode = formData.zip_code || '';

    // Generate filename
    const currentDate = formatDateMMDDYY();
    const nameForFilename = claimantName.replace(/,/g, '').replace(/ /g, '_');
    const filename = `Address_Change_${nameForFilename}_${currentDate}.pdf`;

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

      // Fill in the template fields based on the address change template structure
      // Claimant name at top
      this.drawText(page, claimantName, { x: 116, y: 721, size: 11 });

      // Case ID
      this.drawText(page, caseId, { x: 110, y: 708, size: 11 });

      // Current date below case ID
      this.drawText(page, formattedCurrentDate, { x: 72, y: 695, size: 11 });

      // Address information (assuming it goes in the middle section)
      // Street address
      this.drawText(page, streetAddress, { x: 112, y: 540, size: 11 });

      // City, State, Zip on next line
      const fullAddressLine2 = `${city}, ${state} ${zipCode}`;
      this.drawText(page, fullAddressLine2, { x: 112, y: 525, size: 11 });

      // Replace "Mr. X" with the actual claimant name in the letter text
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
