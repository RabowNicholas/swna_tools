/**
 * Change of Authorized Representative Letter Generator
 * Generates a Change of AR letter to be faxed to OWCP-DEEOIC
 */

import { PDFDocument, StandardFonts } from "pdf-lib";
import { BaseGenerator } from "./base-generator";
import { ClientRecord, GeneratorResult } from "./types";
import { formatDateMMDDYY } from "./utils/formatters";
import { drawSignatureOnLine, SignatureLine } from "./utils/signature";

/**
 * The signature rule beneath "Sincerely,", measured off the template.
 * "Sincerely," sits at y=521, so the ink is capped under that.
 */
const CHANGE_OF_AR_SIGNATURE_LINE: SignatureLine = {
  x0: 72.0,
  x1: 213.1,
  y: 494.9,
  maxHeight: 22,
};

export interface ChangeOfARFormData {
  claimant_name: string;
  letter_date: string; // YYYY-MM-DD
  prev_rep_name: string;
  phone: string;
  signature_file?: {
    data: string; // base64 encoded
  };
}

export class ChangeOfARGenerator extends BaseGenerator {
  constructor() {
    super("change_of_ar_template.pdf");
  }

  /**
   * Format date as "Month DD, YYYY" from YYYY-MM-DD input
   */
  private formatLetterDate(dateStr: string): string {
    if (!dateStr) {
      const now = new Date();
      return now.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    // Use UTC to avoid timezone shifting the day
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  async generate(
    clientRecord: ClientRecord,
    doctor: string,
    formData: ChangeOfARFormData,
  ): Promise<GeneratorResult> {
    const claimantName = formData.claimant_name || "";
    const letterDate = formData.letter_date;
    const prevRepName = formData.prev_rep_name || "";
    const phone = formData.phone || "";
    const signatureFile = formData.signature_file;

    const formattedDate = this.formatLetterDate(letterDate);

    // Generate filename
    const currentDate = formatDateMMDDYY();
    const nameForFilename = claimantName.replace(/,/g, "").replace(/ /g, "_");
    const filename = `Change_of_AR_${nameForFilename}_${currentDate}.pdf`;

    // Load template
    const pdfDoc = await this.loadTemplate();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    firstPage.setFont(font);
    firstPage.setFontSize(11);

    // Draw text fields
    this.drawText(firstPage, claimantName, { x: 103, y: 721, size: 11 });
    this.drawText(firstPage, formattedDate, { x: 98, y: 707, size: 11 });
    this.drawText(firstPage, prevRepName, { x: 272, y: 603, size: 11 });
    this.drawText(firstPage, phone, { x: 250, y: 550, size: 11 });

    // Embed signature image if present
    // Trimmed to the ink and fitted to the signature line beneath "Sincerely,",
    // so uploads of any shape land in the same place
    if (signatureFile?.data) {
      try {
        await drawSignatureOnLine(
          pdfDoc,
          firstPage,
          signatureFile.data,
          CHANGE_OF_AR_SIGNATURE_LINE,
        );
      } catch (error) {
        console.error("[ChangeOfAR] Signature embedding failed:", error);
        this.drawText(firstPage, "[Signature not available]", {
          x: CHANGE_OF_AR_SIGNATURE_LINE.x0,
          y: CHANGE_OF_AR_SIGNATURE_LINE.y + 3,
          size: 8,
        });
      }
    }

    const pdfBytes = await pdfDoc.save();

    return {
      filename,
      pdfBytes: Buffer.from(pdfBytes),
    };
  }
}
