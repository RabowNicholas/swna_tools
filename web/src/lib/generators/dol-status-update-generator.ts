/**
 * DOL Status Update Letter Generator
 * Generates status update letters for DOL cases
 */

import { BaseGenerator } from "./base-generator";
import { ClientRecord, GeneratorResult } from "./types";
import { formatDateMMDDYY } from "./utils/formatters";
import { StandardFonts } from "pdf-lib";

export interface DolStatusUpdateFormData {
  claimant_name: string;
  case_id: string;
  letter_date: string; // ISO date string "YYYY-MM-DD"
}

export class DolStatusUpdateGenerator extends BaseGenerator {
  constructor() {
    super("dol_letter_template_status_update.pdf");
  }

  async generate(
    clientRecord: ClientRecord,
    doctor: string,
    formData: DolStatusUpdateFormData
  ): Promise<GeneratorResult> {
    const claimantName = formData.claimant_name || "";
    const caseId = formData.case_id || "";
    const letterDate = formData.letter_date;

    // Format the letter date as "Month DD, YYYY"
    let formattedDate: string;
    if (letterDate) {
      const dateObj = new Date(letterDate);
      const month = dateObj.toLocaleDateString("en-US", { month: "long" });
      const day = dateObj.getDate();
      const year = dateObj.getFullYear();
      formattedDate = `${month} ${day}, ${year}`;
    } else {
      const now = new Date();
      const month = now.toLocaleDateString("en-US", { month: "long" });
      const day = now.getDate();
      const year = now.getFullYear();
      formattedDate = `${month} ${day}, ${year}`;
    }

    // Generate filename
    const currentDate = formatDateMMDDYY();
    const nameForFilename = claimantName.replace(/,/g, "").replace(/ /g, "_");
    const filename = `DOL_Status_Update_${nameForFilename}_${currentDate}.pdf`;

    // Load template and generate PDF
    const pdfDoc = await this.loadTemplate();

    // Get Times-Roman font
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    // Process all pages
    const pages = pdfDoc.getPages();

    for (const page of pages) {
      page.setFont(font);
      page.setFontSize(11);

      // Fill in the template fields
      // Claimant name at top
      this.drawText(page, claimantName, { x: 119, y: 715, size: 11 });

      // Case ID
      this.drawText(page, caseId, { x: 108, y: 702, size: 11 });

      // Date
      this.drawText(page, formattedDate, { x: 72, y: 689, size: 11 });
    }

    // Save PDF to bytes
    const pdfBytes = await pdfDoc.save();

    return {
      filename,
      pdfBytes: Buffer.from(pdfBytes),
    };
  }
}
