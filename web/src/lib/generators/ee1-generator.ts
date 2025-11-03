/**
 * EE-1 Form Generator
 * Converts Python ee1_generator.py to TypeScript
 * NOTE: Uses DUAL OVERLAY system - signature layer (behind) + marks layer (on top)
 * CRITICAL: Layering order must be preserved for correct rendering
 */

import { PDFDocument, PDFPage, StandardFonts } from 'pdf-lib';
import { BaseGenerator } from './base-generator';
import { ClientRecord, GeneratorResult } from './types';
import { formatDateMMDDYY, formatDateMMDDYYYY, parsePhoneNumber } from './utils/formatters';

export interface EE1DiagnosisItem {
  text: string;
  date: string; // ISO date string
}

export interface EE1DiagnosisCategory {
  selected: boolean;
  date?: string;
  diagnoses?: EE1DiagnosisItem[];
}

export interface EE1DiagnosisCategories {
  cancer?: EE1DiagnosisCategory;
  beryllium_sensitivity?: EE1DiagnosisCategory;
  chronic_beryllium_disease?: EE1DiagnosisCategory;
  chronic_silicosis?: EE1DiagnosisCategory;
  other?: EE1DiagnosisCategory;
}

export interface EE1FormData {
  first_name: string;
  last_name: string;
  ssn: string;
  dob: string; // ISO date string
  sex: 'Male' | 'Female';
  address_main: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  phone: string;
  diagnosis_categories: EE1DiagnosisCategories;
  signature_file?: {
    data: string; // base64 encoded
  };
}

export class EE1Generator extends BaseGenerator {
  constructor() {
    super('EE-1.pdf');
  }

  /**
   * Format date with spacing for PDF form fields
   * Example: "01       15       2024"
   */
  private formatDateSpaced(dateStr: string): string {
    if (!dateStr) return '';

    try {
      const date = new Date(dateStr);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = String(date.getFullYear());
      return `${month}       ${day}       ${year}`;
    } catch {
      return '';
    }
  }

  async generate(
    clientRecord: ClientRecord,
    doctor: string,
    formData: EE1FormData
  ): Promise<GeneratorResult> {
    const firstName = formData.first_name || '';
    const lastName = formData.last_name || '';
    const ssn = formData.ssn || '';
    const dob = formData.dob;
    const sex = formData.sex;
    const addressMain = formData.address_main || '';
    const addressCity = formData.address_city || '';
    const addressState = formData.address_state || '';
    const addressZip = formData.address_zip || '';
    const phone = formData.phone || '';
    const diagnosisCategories = formData.diagnosis_categories || {};
    const signatureFile = formData.signature_file;

    // Parse phone number
    const { areaCode, prefix, lineNumber } = parsePhoneNumber(phone);

    // Generate filename
    const currentDate = formatDateMMDDYY();
    const filename =
      firstName && lastName
        ? `EE1_${firstName[0]}.${lastName}_${currentDate}.pdf`
        : `EE1_Unknown_${currentDate}.pdf`;

    // Load base template
    const basePdfDoc = await this.loadTemplate();
    const basePage = basePdfDoc.getPage(0);

    // Create TWO separate PDF documents for overlays
    // Signature overlay (goes BEHIND template)
    const signatureOverlayDoc = await PDFDocument.create();
    const sigPage = signatureOverlayDoc.addPage([612, 792]); // letter size
    const font = await signatureOverlayDoc.embedFont(StandardFonts.Helvetica);
    sigPage.setFont(font);
    sigPage.setFontSize(10);

    // Marks overlay (goes ON TOP of template)
    const marksOverlayDoc = await PDFDocument.create();
    const marksPage = marksOverlayDoc.addPage([612, 792]); // letter size
    const marksFont = await marksOverlayDoc.embedFont(StandardFonts.Helvetica);
    marksPage.setFont(marksFont);
    marksPage.setFontSize(10);

    // === SIGNATURE OVERLAY (behind form) ===

    // Name (Last, First)
    sigPage.drawText(lastName, { x: 25, y: 645, size: 10 });
    sigPage.drawText(firstName, { x: 185, y: 645, size: 10 });

    // Social Security Number
    sigPage.drawText(ssn, { x: 400, y: 645, size: 10 });

    // Date of Birth
    if (dob) {
      const dobStr = this.formatDateSpaced(dob);
      sigPage.drawText(dobStr, { x: 95, y: 627, size: 10 });
    }

    // Address
    sigPage.drawText(addressMain, { x: 25, y: 585, size: 10 });
    sigPage.drawText(addressCity, { x: 25, y: 555, size: 10 });
    sigPage.drawText(addressZip, { x: 255, y: 555, size: 10 });

    // Phone number
    sigPage.drawText(areaCode, { x: 355, y: 585, size: 10 });
    sigPage.drawText(prefix, { x: 390, y: 585, size: 10 });
    sigPage.drawText(lineNumber, { x: 428, y: 585, size: 10 });

    // === MARKS OVERLAY (on top of form) ===

    // State goes on marks overlay (on top)
    marksPage.drawText(addressState, { x: 215, y: 555, size: 10 });

    // Sex checkbox
    if (sex === 'Male') {
      marksPage.drawText('X', { x: 203, y: 615, size: 10 });
    } else {
      marksPage.drawText('X', { x: 247, y: 615, size: 10 });
    }

    // Diagnosis Categories - Cancer
    if (diagnosisCategories.cancer?.selected) {
      marksPage.drawText('X', { x: 22, y: 518, size: 10 });

      const cancerDiagnoses = diagnosisCategories.cancer.diagnoses || [];
      const yPositions = [495, 478, 459];
      for (let i = 0; i < Math.min(cancerDiagnoses.length, 3); i++) {
        const diagnosis = cancerDiagnoses[i];
        if (diagnosis.text) {
          sigPage.drawText(diagnosis.text, { x: 55, y: yPositions[i], size: 10 });
        }
        if (diagnosis.date) {
          const dateStr = this.formatDateSpaced(diagnosis.date);
          sigPage.drawText(dateStr, { x: 507, y: yPositions[i], size: 10 });
        }
      }
    }

    // Beryllium Sensitivity
    if (diagnosisCategories.beryllium_sensitivity?.selected) {
      marksPage.drawText('X', { x: 22, y: 443, size: 10 });
      if (diagnosisCategories.beryllium_sensitivity.date) {
        const dateStr = this.formatDateSpaced(diagnosisCategories.beryllium_sensitivity.date);
        sigPage.drawText(dateStr, { x: 507, y: 441, size: 10 });
      }
    }

    // Chronic Beryllium Disease (CBD)
    if (diagnosisCategories.chronic_beryllium_disease?.selected) {
      marksPage.drawText('X', { x: 22, y: 425, size: 10 });
      if (diagnosisCategories.chronic_beryllium_disease.date) {
        const dateStr = this.formatDateSpaced(diagnosisCategories.chronic_beryllium_disease.date);
        sigPage.drawText(dateStr, { x: 507, y: 423, size: 10 });
      }
    }

    // Chronic Silicosis
    if (diagnosisCategories.chronic_silicosis?.selected) {
      marksPage.drawText('X', { x: 22, y: 407, size: 10 });
      if (diagnosisCategories.chronic_silicosis.date) {
        const dateStr = this.formatDateSpaced(diagnosisCategories.chronic_silicosis.date);
        sigPage.drawText(dateStr, { x: 507, y: 405, size: 10 });
      }
    }

    // Other Work-Related Conditions
    if (diagnosisCategories.other?.selected) {
      marksPage.drawText('X', { x: 22, y: 388, size: 10 });

      const otherDiagnoses = diagnosisCategories.other.diagnoses || [];
      const yPositions = [370, 352, 335];
      for (let i = 0; i < Math.min(otherDiagnoses.length, 3); i++) {
        const diagnosis = otherDiagnoses[i];
        if (diagnosis.text) {
          sigPage.drawText(diagnosis.text, { x: 55, y: yPositions[i], size: 10 });
        }
        if (diagnosis.date) {
          const dateStr = this.formatDateSpaced(diagnosis.date);
          sigPage.drawText(dateStr, { x: 507, y: yPositions[i], size: 10 });
        }
      }
    }

    // Signature handling (on signature overlay - behind form)
    // Note: Image is pre-processed on client-side (resized to 300x100, flattened, PNG format)
    if (signatureFile?.data) {
      try {
        const imageBuffer = Buffer.from(signatureFile.data, 'base64');

        // Directly embed the pre-processed PNG (already resized and flattened on client)
        const pngImage = await signatureOverlayDoc.embedPng(imageBuffer);
        const dims = pngImage.scale(1);

        sigPage.drawImage(pngImage, {
          x: 103,
          y: 33,
          width: dims.width,
          height: dims.height,
        });
      } catch (error) {
        console.error('[EE1] Signature processing failed:', error);
        sigPage.drawText('[Signature processing failed]', { x: 100, y: 155, size: 10 });
      }
    }

    // Add current date next to signature (on signature overlay)
    const formattedCurrentDate = formatDateMMDDYYYY();
    sigPage.drawText(formattedCurrentDate, { x: 390, y: 42, size: 10 });

    // === MERGE LAYERS IN CORRECT ORDER ===
    // Order: signature overlay (behind) → template → marks overlay (on top)
    // Using PyPDF2-like approach: merge overlays onto base page

    // Embed signature and marks as pages
    const sigBytes = await signatureOverlayDoc.save();
    const marksBytes = await marksOverlayDoc.save();

    const sigPdf = await PDFDocument.load(sigBytes);
    const marksPdf = await marksBytes;

    // Start with base template page
    const outputDoc = await PDFDocument.create();
    const [copiedBasePage] = await outputDoc.copyPages(basePdfDoc, [0]);

    // Get signature and marks as embedded pages
    const [sigEmbedded] = await outputDoc.embedPdf(sigBytes);
    const [marksEmbedded] = await outputDoc.embedPdf(marksBytes);

    // Draw layers in order on the base page
    // Signature first (behind), then marks (on top)
    copiedBasePage.drawPage(sigEmbedded);
    copiedBasePage.drawPage(marksEmbedded);

    outputDoc.addPage(copiedBasePage);

    // Save PDF
    const pdfBytes = await outputDoc.save();

    return {
      filename,
      pdfBytes: Buffer.from(pdfBytes),
    };
  }
}
