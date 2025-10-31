/**
 * EE-10 Form Generator
 * Converts Python ee10_generator.py to TypeScript
 */

import { BaseGenerator } from './base-generator';
import { ClientRecord, EE10FormData, GeneratorResult } from './types';
import {
  formatNameLastFirst,
  parsePhoneNumber,
  formatDateMMDDYYYY,
  formatDateMMDDYY,
  generateFilenameFromName,
} from './utils/formatters';

export class EE10Generator extends BaseGenerator {
  constructor(doctor: string) {
    // Select template based on doctor
    const templateName =
      doctor === 'La Plata' ? 'EE-10_la_plata.pdf' : 'EE-10_lewis.pdf';
    super(templateName);
  }

  async generate(
    clientRecord: ClientRecord,
    doctor: string,
    formData: EE10FormData
  ): Promise<GeneratorResult> {
    const clientName = formData.name || '';

    // Parse name: "First Middle Last" -> "Last, First Middle"
    let formattedName = clientName;
    try {
      const nameParts = clientName.trim().split(/\s+/);
      if (nameParts.length >= 2) {
        // Last name is the final part, everything else is first/middle
        const lastName = nameParts[nameParts.length - 1];
        const firstAndMiddle = nameParts.slice(0, -1).join(' ');
        formattedName = `${lastName}, ${firstAndMiddle}`;
      }
    } catch {
      formattedName = clientName;
    }

    const caseId = formData.case_id || '';
    const addressMain = formData.address_main || '';
    const addressCity = formData.address_city || '';
    const addressState = formData.address_state || '';
    const addressZip = formData.address_zip || '';
    const phone = formData.phone || '';
    const claimType = formData.claim_type;

    // Parse phone number into components
    const { areaCode, prefix, lineNumber } = parsePhoneNumber(phone);

    // Generate filename
    const currentDate = formatDateMMDDYY();
    const fileNamePart = generateFilenameFromName(clientName);
    const filename = `EE10_${fileNamePart}_${currentDate}.pdf`;

    // Load template and draw fields
    const pdfDoc = await this.loadTemplate();
    const page = pdfDoc.getPage(0);

    // Draw all text fields at their coordinates
    // Coordinates match Python generator exactly (Y origin at bottom)

    // Client name and case ID (top of form)
    this.drawText(page, formattedName, { x: 25, y: 644 });
    this.drawText(page, caseId, { x: 460, y: 644 });

    // Current date (bottom right)
    const currentDateFormatted = formatDateMMDDYYYY();
    this.drawText(page, currentDateFormatted, { x: 412, y: 70 });

    // Address fields
    this.drawText(page, addressMain, { x: 25, y: 587 });
    this.drawText(page, addressCity, { x: 25, y: 555 });
    this.drawText(page, addressState, { x: 220, y: 555 });
    this.drawText(page, addressZip, { x: 255, y: 555 });

    // Phone number (split into area code, prefix, line number)
    this.drawText(page, areaCode, { x: 355, y: 612 });
    this.drawText(page, prefix, { x: 390, y: 612 });
    this.drawText(page, lineNumber, { x: 425, y: 612 });

    // Claim type checkbox (X marks)
    if (claimType === 'Initial Impairment Claim') {
      this.drawText(page, 'X', { x: 27, y: 487 });
    } else if (claimType === 'Repeat Impairment Claim') {
      this.drawText(page, 'X', { x: 27, y: 375 });
    }

    // Save PDF to bytes
    const pdfBytes = await pdfDoc.save();

    return {
      filename,
      pdfBytes: Buffer.from(pdfBytes),
    };
  }
}
