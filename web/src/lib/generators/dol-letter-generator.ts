/**
 * DOL Custom Letter Generator
 * Generates custom letters to DOL with free-form content
 */

import { BaseGenerator } from "./base-generator";
import { ClientRecord, GeneratorResult } from "./types";
import { formatDateMMDDYY } from "./utils/formatters";
import { StandardFonts, rgb } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";

export interface DolLetterFormData {
  claimant_name: string;
  case_id: string;
  letter_date: string; // ISO date string "YYYY-MM-DD"
  letter_content: string;
}

export class DolLetterGenerator extends BaseGenerator {
  private static readonly MAX_CHARS_PER_LINE = 100;

  constructor() {
    super("dol_letter_template.pdf");
  }

  /**
   * Wrap text into multiple lines with character limit
   * Adapted from EE-3 generator
   */
  private wrapText(
    text: string,
    maxCharsPerLine: number = DolLetterGenerator.MAX_CHARS_PER_LINE
  ): string[] {
    if (!text) return [""];

    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      // Check if adding this word would exceed the character limit
      if ((currentLine + word).length <= maxCharsPerLine) {
        currentLine += word + " ";
      } else {
        // Finish current line and start new one
        if (currentLine) {
          lines.push(currentLine.trim());
        }
        currentLine = word + " ";
      }
    }

    // Add the last line
    if (currentLine) {
      lines.push(currentLine.trim());
    }

    return lines;
  }

  /**
   * Wrap multi-paragraph text preserving user's paragraph breaks
   */
  private wrapMultiParagraph(
    text: string,
    maxCharsPerLine: number = DolLetterGenerator.MAX_CHARS_PER_LINE
  ): string[] {
    const paragraphs = text.split("\n");
    const allLines: string[] = [];

    for (const paragraph of paragraphs) {
      if (paragraph.trim() === "") {
        // Preserve blank lines for paragraph spacing
        allLines.push("");
      } else {
        // Wrap the paragraph
        const wrappedLines = this.wrapText(paragraph, maxCharsPerLine);
        allLines.push(...wrappedLines);
      }
    }

    return allLines;
  }

  async generate(
    clientRecord: ClientRecord,
    doctor: string,
    formData: DolLetterFormData
  ): Promise<GeneratorResult> {
    const claimantName = formData.claimant_name || "";
    const caseId = formData.case_id || "";
    const letterDate = formData.letter_date;
    const letterContent = formData.letter_content || "";

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

    // Append standard closing text
    const closingText =
      "Please call me with any questions at 808-772-8329, or my business manager at 808-212-3336.";
    const fullContent = letterContent.trim() + "\n\n" + closingText;

    // Wrap text with paragraph preservation
    const wrappedLines = this.wrapMultiParagraph(fullContent);

    // Generate filename
    const currentDate = formatDateMMDDYY();
    const nameForFilename = claimantName.replace(/,/g, "").replace(/ /g, "_");
    const filename = `DOL_Letter_${nameForFilename}_${currentDate}.pdf`;

    // Load template and generate PDF
    const pdfDoc = await this.loadTemplate();

    // Get Times-Roman font
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    // Process all pages
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    firstPage.setFont(font);
    firstPage.setFontSize(11);

    // Fill in the header fields (same coordinates as dol-status-update)
    // Claimant name
    this.drawText(firstPage, claimantName, { x: 119, y: 715, size: 11 });

    // Case ID
    this.drawText(firstPage, caseId, { x: 108, y: 702, size: 11 });

    // Date
    this.drawText(firstPage, formattedDate, { x: 72, y: 689, size: 11 });

    // Draw letter content with wrapping
    const lineHeight = 14;
    let currentY = 580; // Starting Y for letter content (adjust after testing)
    const startX = 72;

    for (const line of wrappedLines) {
      if (line === "") {
        // Blank line for paragraph spacing
        currentY -= lineHeight;
      } else {
        this.drawText(firstPage, line, { x: startX, y: currentY, size: 11 });
        currentY -= lineHeight;
      }

      // Stop early enough to leave room for the signature block drawn below.
      if (currentY < 180) {
        console.warn(
          "[DOL Letter] Content may exceed single page. Consider reducing letter length."
        );
        break;
      }
    }

    // --- Signature block: pinned directly beneath the letter body ---
    // The template has a static signature block baked in at the page bottom.
    // White it out and redraw the signature dynamically below the body so it
    // doesn't float at the bottom on short letters.
    firstPage.drawRectangle({
      x: 55,
      y: 40,
      width: 350,
      height: 125,
      color: rgb(1, 1, 1),
    });

    // Embed the handwritten signature image
    const sigBytes = await readFile(
      path.join(process.cwd(), "public", "templates", "swna_signature.png")
    );
    const sigImg = await pdfDoc.embedPng(sigBytes);
    const sigDims = sigImg.scaleToFit(120, 45);

    const sigLines = [
      "Tyler J. Bailey",
      "President, Southwest Nuclear Advocates",
      "Cell: 808-772-8329",
      "Fax: 702-825-0145",
    ];

    // Top of the signature image: one blank line below the last body line.
    // Clamp upward if the body ran long so the block doesn't run off the page.
    const blockHeight =
      sigDims.height + lineHeight + sigLines.length * lineHeight;
    const minBottom = 50;
    let blockTop = currentY - lineHeight;
    if (blockTop - blockHeight < minBottom) {
      blockTop = minBottom + blockHeight;
    }

    firstPage.drawImage(sigImg, {
      x: startX,
      y: blockTop - sigDims.height,
      width: sigDims.width,
      height: sigDims.height,
    });

    let sigTextY = blockTop - sigDims.height - lineHeight;
    for (const line of sigLines) {
      this.drawText(firstPage, line, { x: startX, y: sigTextY, size: 11 });
      sigTextY -= lineHeight;
    }

    // Save PDF to bytes
    const pdfBytes = await pdfDoc.save();

    return {
      filename,
      pdfBytes: Buffer.from(pdfBytes),
    };
  }
}
