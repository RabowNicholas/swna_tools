/**
 * Change of Authorized Representative Letter Generator
 * Generates a Change of AR letter to be faxed to OWCP-DEEOIC
 */

import { PDFDocument, StandardFonts } from "pdf-lib";
import { BaseGenerator } from "./base-generator";
import { ClientRecord, GeneratorResult } from "./types";
import { formatDateMMDDYY } from "./utils/formatters";

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
    if (signatureFile?.data) {
      try {
        const imageBuffer = Buffer.from(signatureFile.data, "base64");

        // Detect image type from magic bytes
        let image;
        if (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50) {
          // PNG magic bytes: 89 50 4E 47
          image = await pdfDoc.embedPng(imageBuffer);
        } else {
          // JPEG magic bytes: FF D8 FF
          image = await pdfDoc.embedJpg(imageBuffer);
        }

        const dims = image.scaleToFit(200, 60);
        firstPage.drawImage(image, {
          x: 72,
          y: 140,
          width: dims.width,
          height: dims.height,
        });
      } catch (error) {
        console.error("[ChangeOfAR] Signature embedding failed:", error);
        this.drawText(firstPage, "[Signature not available]", {
          x: 72,
          y: 155,
          size: 10,
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
