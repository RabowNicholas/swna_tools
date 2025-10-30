/**
 * IR Notice (La Plata) Generator
 * Converts Python ir_notice_la_plata_generator.py to TypeScript
 */

import { BaseGenerator } from './base-generator';
import { GeneratorResult } from './types';
import { formatDateMMDDYY } from './utils/formatters';
import { StandardFonts } from 'pdf-lib';

export interface IRNoticeFormData {
  client_name: string;
  file_number: string;
  appointment_date: string;
}

export class LaPlataNoticeGenerator extends BaseGenerator {
  constructor() {
    super('ir_notice_la_plata.pdf');
  }

  async generate(
    clientName: string,
    fileNumber: string,
    appointmentDate: string
  ): Promise<GeneratorResult> {
    // Load template
    const pdfDoc = await this.loadTemplate();
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const page = pdfDoc.getPage(0);

    page.setFont(font);
    page.setFontSize(11);

    // Draw fields
    this.drawText(page, clientName, { x: 112, y: 711, size: 11 });
    this.drawText(page, fileNumber, { x: 98, y: 698, size: 11 });
    this.drawText(page, appointmentDate, { x: 70, y: 526, size: 11 });

    // Generate filename
    const currentDate = formatDateMMDDYY();
    const nameForFilename = clientName.replace(/ /g, '_');
    const filename = `LaPlata_Notice_${nameForFilename}_${currentDate}.pdf`;

    // Save PDF
    const pdfBytes = await pdfDoc.save();

    return {
      filename,
      pdfBytes: Buffer.from(pdfBytes),
    };
  }
}
