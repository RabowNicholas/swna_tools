/**
 * IR Schedule Notice Generator
 * Converts Python ir_notice_la_plata_generator.py to TypeScript
 */

import { BaseGenerator } from "./base-generator";
import { GeneratorResult } from "./types";
import { formatDateMMDDYY, formatDateMMMDDYYYY } from "./utils/formatters";
import { StandardFonts } from "pdf-lib";

export interface IRNoticeFormData {
  client_name: string;
  file_number: string;
  appointment_date: string;
  provider_name?: string;
}

// Available provider options
export const PROVIDER_OPTIONS = [
  { value: "La Plata Medical", label: "La Plata Medical" },
  { value: "Dr. Lewis", label: "Dr. Lewis" },
] as const;

export type ProviderName = typeof PROVIDER_OPTIONS[number]["value"];

export class LaPlataNoticeGenerator extends BaseGenerator {
  constructor() {
    super("ir_notice_la_plata.pdf");
  }

  async generate(
    clientName: string,
    fileNumber: string,
    appointmentDate: string,
    providerName: string = "La Plata Medical"
  ): Promise<GeneratorResult> {
    // Load template
    const pdfDoc = await this.loadTemplate();
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const page = pdfDoc.getPage(0);

    page.setFont(font);
    page.setFontSize(11);

    // Get current date for letter header
    const currentDateFormatted = formatDateMMMDDYYYY();

    // Draw fields
    this.drawText(page, clientName, { x: 112, y: 711, size: 11 });
    this.drawText(page, fileNumber, { x: 98, y: 698, size: 11 });
    this.drawText(page, currentDateFormatted, { x: 69, y: 685, size: 11 }); // Current date line
    this.drawText(page, providerName, { x: 409, y: 546, size: 11 }); // Provider name (after "with")
    this.drawText(page, appointmentDate + ".", { x: 69, y: 533, size: 11 }); // Appointment date with period (after "for")

    // Generate filename
    const currentDate = formatDateMMDDYY();
    const nameForFilename = clientName.replace(/ /g, "_");
    const filename = `IR_Notice_${nameForFilename}_${currentDate}.pdf`;

    // Save PDF
    const pdfBytes = await pdfDoc.save();

    return {
      filename,
      pdfBytes: Buffer.from(pdfBytes),
    };
  }
}
