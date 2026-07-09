/**
 * RD Accept Waiver Generator
 * Direct port from the deleted Python rd_waiver_generator.py to TypeScript.
 *
 * Fills templates/rd_accept_waiver.pdf ("Waiver for Recommended Decision (RD)
 * Acceptance"). Coordinates below are ported verbatim from the final Python
 * version (reportlab canvas.drawString, origin bottom-left) and should be
 * verified against a generated test PDF.
 */

import { BaseGenerator } from './base-generator';
import { ClientRecord, GeneratorResult } from './types';
import { formatDateMMDDYY, formatDateMMDDYYYY } from './utils/formatters';
import { StandardFonts } from 'pdf-lib';
import path from 'path';

export interface RDWaiverFormData {
  claimant_name: string;
  employee_name: string;
  case_id: string;
  rd_decision_date: string; // MM/DD/YYYY
  option?: '1' | '2'; // which waiver option to sign; defaults to '2'
}

export class RDWaiverGenerator extends BaseGenerator {
  constructor() {
    super('rd_accept_waiver.pdf');
  }

  async generate(
    clientRecord: ClientRecord,
    doctor: string,
    formData: RDWaiverFormData
  ): Promise<GeneratorResult> {
    const claimant = formData.claimant_name || '';
    const employee = formData.employee_name || '';
    const caseId = formData.case_id || '';
    const rdDecisionDate = formData.rd_decision_date || '';
    const currentDate = formatDateMMDDYYYY();
    const option = formData.option === '1' ? '1' : '2';

    // Each option has its own template (signature is a baked-in image that
    // must sit on the chosen option's signature line) and its own body
    // coordinates. Coordinates verified against generated test PDFs.
    if (option === '1') {
      this.templatePath = path.join(
        process.cwd(),
        'public',
        'templates',
        'rd_accept_waiver_option_1.pdf'
      );
    }
    // Option 2 keeps the constructor default (rd_accept_waiver.pdf).

    // "I, ____" name line and signature/date line differ per option because
    // the two option blocks are different heights.
    const bodyNameY = option === '1' ? 482 : 247;
    const bodyDateY = option === '1' ? 317 : 178;

    // filename format: RD_waiver_F.Last_MM.DD.YY.pdf
    const shortDate = formatDateMMDDYY();
    let filename = 'RDWaiver.pdf';
    const parts = claimant.trim().split(/\s+/);
    if (parts.length >= 2) {
      const first = parts[0];
      const last = parts[parts.length - 1];
      filename = `RD_waiver_${first[0]}.${last}_${shortDate}.pdf`;
    }

    // Load template and generate PDF
    const pdfDoc = await this.loadTemplate();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const page = pdfDoc.getPages()[0];
    page.setFont(font);
    page.setFontSize(11);

    // Header block coordinates are identical for both options.
    this.drawText(page, caseId, { x: 410, y: 675, size: 11 });
    this.drawText(page, employee, { x: 378, y: 662, size: 11 });
    this.drawText(page, claimant, { x: 374, y: 647, size: 11 });
    this.drawText(page, rdDecisionDate, { x: 410, y: 634, size: 11 });
    // Body name + date land on the selected option's block.
    this.drawText(page, claimant, { x: 83, y: bodyNameY, size: 11 });
    this.drawText(page, currentDate, { x: 315, y: bodyDateY, size: 11 });

    const pdfBytes = await pdfDoc.save();

    return {
      filename,
      pdfBytes: Buffer.from(pdfBytes),
    };
  }
}
