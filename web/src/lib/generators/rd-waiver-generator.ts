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

export interface RDWaiverFormData {
  claimant_name: string;
  employee_name: string;
  case_id: string;
  rd_decision_date: string; // MM/DD/YYYY
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

    // filename format from Python: RD_accept_waiver_F.Last_MM.DD.YY.pdf
    const shortDate = formatDateMMDDYY();
    let filename = 'RDAccept.pdf';
    const parts = claimant.trim().split(/\s+/);
    if (parts.length >= 2) {
      const first = parts[0];
      const last = parts[parts.length - 1];
      filename = `RD_accept_waiver_${first[0]}.${last}_${shortDate}.pdf`;
    }

    // Load template and generate PDF
    const pdfDoc = await this.loadTemplate();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const page = pdfDoc.getPages()[0];
    page.setFont(font);
    page.setFontSize(11);

    // Coordinates ported verbatim from the final Python generator.
    this.drawText(page, caseId, { x: 410, y: 675, size: 11 });
    this.drawText(page, employee, { x: 378, y: 662, size: 11 });
    this.drawText(page, claimant, { x: 374, y: 647, size: 11 });
    this.drawText(page, rdDecisionDate, { x: 410, y: 634, size: 11 });
    this.drawText(page, claimant, { x: 83, y: 247, size: 11 });
    this.drawText(page, currentDate, { x: 315, y: 178, size: 11 });

    const pdfBytes = await pdfDoc.save();

    return {
      filename,
      pdfBytes: Buffer.from(pdfBytes),
    };
  }
}
