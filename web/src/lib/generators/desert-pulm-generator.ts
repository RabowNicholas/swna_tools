/**
 * Desert Pulm Referral Generator
 * Converts Python desert_pulm_referral_generator.py to TypeScript
 */

import { BaseGenerator } from './base-generator';
import { ClientRecord, GeneratorResult } from './types';
import { formatDateMMDDYY, formatDateMMDDYYYY } from './utils/formatters';
import { StandardFonts } from 'pdf-lib';

export interface DesertPulmFormData {
  patient_name: string;
  phone_number: string;
  dob: string; // ISO date string
  case_id: string;
  address_main: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  dx_code: string;
}

export class DesertPulmReferralGenerator extends BaseGenerator {
  constructor() {
    super('desert_pulm_la_plata_ref.pdf');
  }

  async generate(
    clientRecord: ClientRecord,
    doctor: string,
    formData: DesertPulmFormData
  ): Promise<GeneratorResult> {
    const patientName = formData.patient_name || '';
    const phoneNumber = formData.phone_number || '';
    const dob = formData.dob;
    const caseId = formData.case_id || '';
    const addressMain = formData.address_main || '';
    const addressCity = formData.address_city || '';
    const addressState = formData.address_state || '';
    const addressZip = formData.address_zip || '';
    const dxCode = formData.dx_code || '';

    // Generate filename
    const currentDate = formatDateMMDDYY();
    const nameForFilename = patientName.replace(/,/g, '').replace(/ /g, '_');
    const filename = `Desert_Pulm_Referral_${nameForFilename}_${currentDate}.pdf`;

    // Load template
    const pdfDoc = await this.loadTemplate();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    const formattedCurrentDate = formatDateMMDDYYYY();

    // Format DOB
    let dobStr = '';
    if (dob) {
      const dobDate = new Date(dob);
      dobStr = formatDateMMDDYYYY(dobDate);
    }

    // Page 1 - Referral information and orders
    if (pages.length > 0) {
      const page1 = pages[0];
      page1.setFont(font);
      page1.setFontSize(10);

      // Current date at the top
      this.drawText(page1, formattedCurrentDate, { x: 100, y: 599, size: 10 });

      // Patient name in "The patient, [NAME] has been REFERRED TO:" section
      this.drawText(page1, patientName, { x: 135, y: 563, size: 10 });

      // DX field (diagnosis code)
      this.drawText(page1, dxCode, { x: 92, y: 126, size: 10 });
    }

    // Page 2 - Patient information section
    if (pages.length > 1) {
      const page2 = pages[1];
      page2.setFont(font);
      page2.setFontSize(10);

      // Patient Name
      this.drawText(page2, patientName, { x: 105, y: 675, size: 10 });

      // Phone number
      this.drawText(page2, phoneNumber, { x: 150, y: 639, size: 10 });

      // Date of Birth
      if (dobStr) {
        this.drawText(page2, dobStr, { x: 100, y: 603, size: 10 });
      }

      // Case ID
      this.drawText(page2, caseId, { x: 118, y: 567, size: 10 });

      // Address (combine all address fields)
      const fullAddress = `${addressMain}, ${addressCity}, ${addressState} ${addressZip}`;
      this.drawText(page2, fullAddress, { x: 118, y: 531, size: 10 });

      // Insurance section - INSURED field gets patient name
      this.drawText(page2, patientName, { x: 127, y: 409, size: 10 });

      // Insured ID# gets the case ID
      this.drawText(page2, caseId, { x: 475, y: 385, size: 10 });

      // Signature line - add doctor name and date
      this.drawText(page2, formattedCurrentDate, { x: 450, y: 220, size: 10 });
    }

    // Save PDF
    const pdfBytes = await pdfDoc.save();

    return {
      filename,
      pdfBytes: Buffer.from(pdfBytes),
    };
  }
}
