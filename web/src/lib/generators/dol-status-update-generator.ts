/**
 * DOL Status Update Letter Generator
 * Generates status update letters for DOL cases
 */

import { BaseGenerator } from "./base-generator";
import { ClientRecord, GeneratorResult } from "./types";
import { formatDateMMDDYY } from "./utils/formatters";
import { sanitizeForWinAnsi, wrapToWidth } from "./utils/text-flow";
import { DEFAULT_STATUS_UPDATE_SUBJECT } from "@/lib/status-update-subject";
import { StandardFonts, rgb } from "pdf-lib";

export interface DolStatusUpdateFormData {
  claimant_name: string;
  case_id: string;
  letter_date: string; // ISO date string "YYYY-MM-DD"
  /** What the letter asks about, in place of "the above-referenced claim". */
  subject?: string;
}

/** A problem with the typed subject the user can fix, as opposed to a server fault. */
export class SubjectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubjectError";
  }
}

// The template's request paragraph ("We are writing to respectfully request...") is three
// lines of Times 11pt on 13.2pt leading. It is followed by one blank line and then fixed
// text, and the signature is a raster baked into the template, so nothing below can move:
// a custom paragraph has to fit the same three lines.
const REQUEST_PARAGRAPH = {
  x: 72,
  width: 415,
  // Baseline of the first line, in PDF points from the bottom of the page.
  firstBaselineY: 553.1,
  lineHeight: 13.2,
  maxLines: 3,
  // White-out covering the template's own paragraph, clear of the "Our office represents..."
  // line above and the "Thank you..." line below.
  whiteOut: { x: 70, y: 520, width: 430, height: 46 },
};

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

    // The generator supplies the sentence's closing period, so drop any typed one.
    let subject: string;
    try {
      subject =
        sanitizeForWinAnsi(formData.subject || "")
          .trim()
          .replace(/[.,;:\s]+$/, "") || DEFAULT_STATUS_UPDATE_SUBJECT;
    } catch (error) {
      throw new SubjectError(error instanceof Error ? error.message : String(error));
    }

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

    // A custom subject replaces the template's request paragraph; the default leaves the
    // template's own text alone so that letter is unchanged.
    if (subject !== DEFAULT_STATUS_UPDATE_SUBJECT) {
      const p = REQUEST_PARAGRAPH;
      const lines = wrapToWidth(
        `We are writing to respectfully request a status update on ${subject}. ` +
          "Please advise as to the current status and whether any additional " +
          "information or action is required at this time.",
        font,
        11,
        p.width
      );
      if (lines.length > p.maxLines) {
        throw new SubjectError(
          "What you're asking about is too long to fit the letter. Shorten it and generate again."
        );
      }

      const firstPage = pages[0];
      firstPage.drawRectangle({ ...p.whiteOut, color: rgb(1, 1, 1) });
      lines.forEach((line, i) => {
        this.drawText(firstPage, line, {
          x: p.x,
          y: p.firstBaselineY - i * p.lineHeight,
          size: 11,
        });
      });
    }

    // Save PDF to bytes
    const pdfBytes = await pdfDoc.save();

    return {
      filename,
      pdfBytes: Buffer.from(pdfBytes),
    };
  }
}
