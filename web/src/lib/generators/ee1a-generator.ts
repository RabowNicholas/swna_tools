/**
 * EE-1A Form Generator
 * Converts Python ee1a_generator.py to TypeScript
 * NOTE: Includes image processing for signatures
 */

import { BaseGenerator } from './base-generator';
import { ClientRecord, GeneratorResult } from './types';
import { formatDateMMDDYY, formatDateMMDDYYYY, parsePhoneNumber } from './utils/formatters';
import { StandardFonts } from 'pdf-lib';
import sharp from 'sharp';

export interface EE1ADiagnosis {
  diagnosis_text?: string;
  diagnosis?: string; // Old format fallback
  diagnosis_date?: string; // ISO date string
  date?: string; // Old format fallback
}

export interface EE1AFormData {
  first_name: string;
  last_name: string;
  case_id: string;
  address_main: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  phone: string;
  diagnoses: EE1ADiagnosis[];
  signature_file?: {
    data: string; // base64 encoded
  };
}

export class EE1AGenerator extends BaseGenerator {
  constructor() {
    super('EE-1a.pdf');
  }

  async generate(
    clientRecord: ClientRecord,
    doctor: string,
    formData: EE1AFormData
  ): Promise<GeneratorResult> {
    const firstName = formData.first_name || '';
    const lastName = formData.last_name || '';
    const caseId = formData.case_id || '';
    const addressMain = formData.address_main || '';
    const addressCity = formData.address_city || '';
    const addressState = formData.address_state || '';
    const addressZip = formData.address_zip || '';
    const phone = formData.phone || '';
    const diagnoses = formData.diagnoses || [];
    const signatureFile = formData.signature_file;

    // Parse phone number
    const { areaCode, prefix, lineNumber } = parsePhoneNumber(phone);

    // Generate filename
    const currentDate = formatDateMMDDYY();
    const filename =
      firstName && lastName
        ? `EE1a_${firstName[0]}.${lastName}_${currentDate}.pdf`
        : `EE1a_Unknown_${currentDate}.pdf`;

    // Load template
    const pdfDoc = await this.loadTemplate();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.getPage(0);

    page.setFont(font);
    page.setFontSize(10);

    // 1. Name (Last, First, Middle Initial)
    this.drawText(page, lastName, { x: 25, y: 615, size: 10 });
    this.drawText(page, firstName, { x: 185, y: 615, size: 10 });

    // 2. Case ID Number
    this.drawText(page, caseId, { x: 400, y: 615, size: 10 });

    // 3. Address (Street, Apt. #, P.O. Box)
    this.drawText(page, addressMain, { x: 25, y: 582, size: 10 });

    // 3. Address (City, State, ZIP Code)
    this.drawText(page, addressCity, { x: 25, y: 555, size: 10 });
    this.drawText(page, addressState, { x: 215, y: 555, size: 10 });
    this.drawText(page, addressZip, { x: 255, y: 555, size: 10 });

    // 4. Telephone Numbers - Home phone
    if (areaCode) this.drawText(page, areaCode, { x: 355, y: 583, size: 10 });
    if (prefix) this.drawText(page, prefix, { x: 390, y: 583, size: 10 });
    if (lineNumber) this.drawText(page, lineNumber, { x: 428, y: 583, size: 10 });

    // 5. Diagnoses
    const diagnosisYPositions = [496, 479, 461, 443, 426]; // a, b, c, d, e

    for (let i = 0; i < Math.min(diagnoses.length, 5); i++) {
      const diagnosis = diagnoses[i];
      const yPos = diagnosisYPositions[i];

      // Diagnosis text
      const diagnosisText =
        diagnosis.diagnosis_text || diagnosis.diagnosis || '';
      if (diagnosisText) {
        this.drawText(page, diagnosisText, { x: 33, y: yPos, size: 10 });
      }

      // 6. Date of Diagnosis (Month, Day, Year)
      const dateValue = diagnosis.diagnosis_date || diagnosis.date;
      if (dateValue) {
        try {
          const dateObj = new Date(dateValue);
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          const year = String(dateObj.getFullYear());

          this.drawText(page, month, { x: 510, y: yPos, size: 10 });
          this.drawText(page, day, { x: 543, y: yPos, size: 10 });
          this.drawText(page, year, { x: 568, y: yPos, size: 10 });
        } catch (error) {
          console.error('[EE1A] Failed to parse diagnosis date:', error);
        }
      }
    }

    // Signature handling
    if (signatureFile?.data) {
      try {
        // Decode base64 image
        const imageBuffer = Buffer.from(signatureFile.data, 'base64');

        // Process with sharp: resize and convert to PNG
        const maxWidth = 200;
        const maxHeight = 60;

        const processedImage = await sharp(imageBuffer)
          .resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .flatten({ background: { r: 255, g: 255, b: 255 } }) // White background
          .png()
          .toBuffer();

        // Embed image in PDF
        const pngImage = await pdfDoc.embedPng(processedImage);
        const dims = pngImage.scale(1);

        page.drawImage(pngImage, {
          x: 108,
          y: 165,
          width: dims.width,
          height: dims.height,
        });
      } catch (error) {
        console.error('[EE1A] Signature processing failed:', error);
        this.drawText(page, '[Signature processing failed]', {
          x: 85,
          y: 185,
          size: 10,
        });
      }
    }

    // Add current date next to signature
    const formattedCurrentDate = formatDateMMDDYYYY();
    this.drawText(page, formattedCurrentDate, { x: 385, y: 175, size: 10 });

    // Save PDF
    const pdfBytes = await pdfDoc.save();

    return {
      filename,
      pdfBytes: Buffer.from(pdfBytes),
    };
  }
}
