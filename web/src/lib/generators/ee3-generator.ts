/**
 * EE-3 Form Generator
 * Converts Python ee3_generator.py to TypeScript
 * MOST COMPLEX: Multi-page with text wrapping, page-specific coordinate deltas, 3 employer sections
 */

import { PDFDocument, PDFPage, StandardFonts } from 'pdf-lib';
import { BaseGenerator } from './base-generator';
import { ClientRecord, GeneratorResult } from './types';
import { formatDateMMDDYY, formatDateMMDDYYYY } from './utils/formatters';

export interface EE3EmploymentRecord {
  start_date: string; // ISO date
  end_date: string; // ISO date
  facility_name: string;
  specific_location: string;
  city: string;
  state: string;
  contractor: string;
  position_title: string;
  union_member?: boolean;
  dosimetry_worn?: boolean;
  work_duties: string;
}

export interface EE3ContactPerson {
  first_name: string;
  last_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface EE3EmployeeContact {
  address: string;
  city: string;
  state: string;
  zip: string;
  phone_home: string;
  phone_work: string;
  phone_cell: string;
}

export interface EE3FormData {
  first_name: string;
  last_name: string;
  former_name?: string;
  ssn: string;
  employment_history: EE3EmploymentRecord[];
  employee_address: string;
  employee_city: string;
  employee_state: string;
  employee_zip: string;
  phone_home: string;
  phone_work: string;
  phone_cell: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_address: string;
  contact_city: string;
  contact_state: string;
  contact_zip: string;
}

interface CoordinateDeltas {
  dates: number;
  facility: number;
  contractor: number;
  position: number;
  union_checkbox?: number;
  dosimetry_checkbox?: number;
  facility_checkbox?: number;
  duties: number;
  exposures?: number;
}

export class EE3Generator extends BaseGenerator {
  constructor() {
    super('EE-3.pdf');
  }

  /**
   * Wrap text into multiple lines with character limit
   * Returns empty array if text exceeds max_lines (warning logged)
   */
  private wrapText(text: string, maxCharsPerLine: number = 140, maxLines: number = 4): string[] {
    if (!text) return [''];

    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      // Check if adding this word would exceed the character limit
      if ((currentLine + word).length <= maxCharsPerLine) {
        currentLine += word + ' ';
      } else {
        // Finish current line and start new one
        if (currentLine) {
          lines.push(currentLine.trim());
        }
        currentLine = word + ' ';

        // Check if we've exceeded max lines
        if (lines.length >= maxLines) {
          console.warn(
            `[EE3] Warning: Work duties text exceeds ${maxLines} lines. Text not added to PDF - please add manually after generation.`
          );
          return [];
        }
      }
    }

    // Add the last line
    if (currentLine) {
      lines.push(currentLine.trim());
    }

    // Final check for line count
    if (lines.length > maxLines) {
      console.warn(
        `[EE3] Warning: Work duties text exceeds ${maxLines} lines. Text not added to PDF - please add manually after generation.`
      );
      return [];
    }

    return lines;
  }

  /**
   * Draw a single employer section at specified base Y coordinate
   */
  private drawEmployerSection(
    overlay: PDFPage,
    marksOverlay: PDFPage,
    job: EE3EmploymentRecord,
    baseY: number,
    deltas: CoordinateDeltas,
    totalEmployers: number,
    pageNum: number
  ): void {
    // Parse dates
    let startDateStr = '';
    if (job.start_date) {
      const startDate = new Date(job.start_date);
      const month = String(startDate.getMonth() + 1).padStart(2, '0');
      const day = String(startDate.getDate()).padStart(2, '0');
      const year = String(startDate.getFullYear());
      startDateStr = `${month}/${day}/${year}`;
    }

    let endDateStr = '';
    if (job.end_date) {
      const endDate = new Date(job.end_date);
      const month = String(endDate.getMonth() + 1).padStart(2, '0');
      const day = String(endDate.getDate()).padStart(2, '0');
      const year = String(endDate.getFullYear());
      endDateStr = `${month}/${day}/${year}`;
    }

    // Dates section
    const datesY = baseY + deltas.dates;
    if (startDateStr) {
      const [month, day, year] = startDateStr.split('/');
      overlay.drawText(month, { x: 200, y: datesY, size: 9 });
      overlay.drawText(day, { x: 250, y: datesY, size: 9 });
      overlay.drawText(year, { x: 300, y: datesY, size: 9 });
    }

    if (endDateStr) {
      const [month, day, year] = endDateStr.split('/');
      overlay.drawText(month, { x: 435, y: datesY, size: 9 });
      overlay.drawText(day, { x: 485, y: datesY, size: 9 });
      overlay.drawText(year, { x: 535, y: datesY, size: 9 });
    }

    // Facility information
    const facilityY = baseY + deltas.facility;
    overlay.drawText(job.facility_name, { x: 30, y: facilityY, size: 9 });
    overlay.drawText(job.specific_location, { x: 265, y: facilityY, size: 9 });

    // City/State
    const cityState = `${job.city}, ${job.state}`;
    overlay.drawText(cityState, { x: 435, y: facilityY, size: 9 });

    // Contractor/sub-contractor
    const contractorY = baseY + deltas.contractor;
    overlay.drawText(job.contractor, { x: 30, y: contractorY, size: 9 });

    // Position Title
    const positionY = baseY + deltas.position;
    overlay.drawText(job.position_title, { x: 30, y: positionY, size: 9 });

    // Union Member checkbox
    const unionMember = job.union_member || false;
    if (deltas.union_checkbox !== undefined && unionMember) {
      const unionCheckboxY = baseY + deltas.union_checkbox;
      // X coordinate depends on page - page 1 uses 212, page 2+ uses 204
      const unionX = pageNum === 0 ? 212 : 204;
      marksOverlay.drawText('X', { x: unionX, y: unionCheckboxY, size: 10 });
    }

    // Dosimeter Badge Worn checkbox
    const dosimetryWorn = job.dosimetry_worn || false;
    if (deltas.dosimetry_checkbox !== undefined && dosimetryWorn) {
      const dosimetryCheckboxY = baseY + deltas.dosimetry_checkbox;
      marksOverlay.drawText('X', { x: 438, y: dosimetryCheckboxY, size: 10 });
    }

    // Facility Type Checkboxes - only if multiple employers and not on page 0
    if (totalEmployers > 1 && pageNum > 0 && deltas.facility_checkbox !== undefined) {
      const facilityCheckboxY = baseY + deltas.facility_checkbox;
      // Department of Energy Facility checkbox - always mark
      marksOverlay.drawText('X', { x: 280, y: facilityCheckboxY, size: 10 });
    }

    // Description of Work Duties
    const dutiesY = baseY + deltas.duties;
    const duties = job.work_duties;
    const dutiesLines = this.wrapText(duties);

    // Only add work duties if they fit within the line limit
    if (dutiesLines.length > 0) {
      let yPosition = dutiesY;
      for (const line of dutiesLines) {
        overlay.drawText(line, { x: 20, y: yPosition, size: 9 });
        yPosition -= 12; // Move down 12 points for next line
      }
    }

    // Work conditions/exposures - only for page 2
    if (deltas.exposures !== undefined) {
      const exposuresY = baseY + deltas.exposures;
      const exposuresText =
        'Claimant stated they were exposed to radiation, silica dust, and other chemicals, solvents and contaminants during the course of their employment.';
      const exposuresLines = this.wrapText(exposuresText);

      if (exposuresLines.length > 0) {
        let yPosition = exposuresY;
        for (const line of exposuresLines) {
          overlay.drawText(line, { x: 20, y: yPosition, size: 9 });
          yPosition -= 12;
        }
      }
    }
  }

  async generate(
    clientRecord: ClientRecord,
    doctor: string,
    formData: EE3FormData
  ): Promise<GeneratorResult> {
    const firstName = formData.first_name || '';
    const lastName = formData.last_name || '';
    const name = lastName && firstName ? `${lastName}, ${firstName}` : '';
    const formerName = formData.former_name || '';
    const ssn = formData.ssn || '';
    let employmentHistory = formData.employment_history || [];

    // Check if we have more employers than supported
    if (employmentHistory.length > 3) {
      console.warn(
        `[EE3] Warning: EE-3 form supports maximum 3 employers. Only first 3 will be included. Additional employers need to be added manually.`
      );
      employmentHistory = employmentHistory.slice(0, 3);
    }

    // Generate filename
    const currentDate = formatDateMMDDYY();
    const filename =
      firstName && lastName
        ? `EE3_${firstName[0]}.${lastName}_${currentDate}.pdf`
        : `EE3_Unknown_${currentDate}.pdf`;

    // Load base template
    const basePdfDoc = await this.loadTemplate();

    // Define page-specific coordinate deltas
    const page1Deltas: CoordinateDeltas = {
      dates: 0,
      facility: -50,
      contractor: -95,
      position: -125,
      union_checkbox: -400,
      duties: -180,
      exposures: -280,
    };

    const page2Employer2Deltas: CoordinateDeltas = {
      dates: 0,
      facility: -45,
      contractor: -84,
      position: -110,
      duties: -155,
      exposures: -210,
      facility_checkbox: -74,
      union_checkbox: -282,
      dosimetry_checkbox: -107,
    };

    const page2Employer3Deltas: CoordinateDeltas = {
      dates: 0,
      facility: -45,
      contractor: -84,
      position: -110,
      duties: -155,
      exposures: -210,
      facility_checkbox: -72,
      union_checkbox: -278,
      dosimetry_checkbox: -103,
    };

    // Define employer positions
    interface EmployerPosition {
      page: number;
      baseY: number;
      deltas: CoordinateDeltas;
    }

    const employerPositions: EmployerPosition[] = [
      { page: 0, baseY: 450, deltas: page1Deltas }, // Employer 1 - Page 1
      { page: 1, baseY: 735, deltas: page2Employer2Deltas }, // Employer 2 - Page 2 top
      { page: 1, baseY: 430, deltas: page2Employer3Deltas }, // Employer 3 - Page 2 bottom
    ];

    // Create overlays for pages
    const page1OverlayDoc = await PDFDocument.create();
    const page1Overlay = page1OverlayDoc.addPage([612, 792]);
    const font1 = await page1OverlayDoc.embedFont(StandardFonts.Helvetica);
    page1Overlay.setFont(font1);
    page1Overlay.setFontSize(9);

    const page1MarksDoc = await PDFDocument.create();
    const page1Marks = page1MarksDoc.addPage([612, 792]);
    const marksFont1 = await page1MarksDoc.embedFont(StandardFonts.Helvetica);
    page1Marks.setFont(marksFont1);
    page1Marks.setFontSize(10);

    // Employee Basic Information (Page 1)
    page1Overlay.drawText(name, { x: 30, y: 640, size: 9 });
    if (formerName) {
      page1Overlay.drawText(formerName, { x: 250, y: 640, size: 9 });
    }
    page1Overlay.drawText(ssn, { x: 440, y: 640, size: 9 });

    // Create page 2 overlays
    const page2OverlayDoc = await PDFDocument.create();
    const page2Overlay = page2OverlayDoc.addPage([612, 792]);
    const font2 = await page2OverlayDoc.embedFont(StandardFonts.Helvetica);
    page2Overlay.setFont(font2);
    page2Overlay.setFontSize(9);

    const page2MarksDoc = await PDFDocument.create();
    const page2Marks = page2MarksDoc.addPage([612, 792]);
    const marksFont2 = await page2MarksDoc.embedFont(StandardFonts.Helvetica);
    page2Marks.setFont(marksFont2);
    page2Marks.setFontSize(10);

    // Add date to page 2
    const formattedCurrentDate = formatDateMMDDYYYY();
    page2Overlay.drawText(formattedCurrentDate, { x: 340, y: 58, size: 9 });

    // Draw each employer in their designated position
    for (let i = 0; i < employmentHistory.length; i++) {
      const job = employmentHistory[i];
      if (i < employerPositions.length) {
        const position = employerPositions[i];
        if (position.page === 0) {
          this.drawEmployerSection(
            page1Overlay,
            page1Marks,
            job,
            position.baseY,
            position.deltas,
            employmentHistory.length,
            position.page
          );
        } else if (position.page === 1) {
          this.drawEmployerSection(
            page2Overlay,
            page2Marks,
            job,
            position.baseY,
            position.deltas,
            employmentHistory.length,
            position.page
          );
        }
      }
    }

    // Merge overlays with template pages
    const finalDoc = await PDFDocument.create();

    // Page 1
    const page1OverlayBytes = await page1OverlayDoc.save();
    const page1MarksBytes = await page1MarksDoc.save();

    const [page1Embedded] = await finalDoc.embedPdf(page1OverlayBytes);
    const [page1MarksEmbedded] = await finalDoc.embedPdf(page1MarksBytes);
    const [basePage1] = await finalDoc.copyPages(basePdfDoc, [0]);

    // Layer: overlay → template → marks
    basePage1.drawPage(page1Embedded);
    basePage1.drawPage(page1MarksEmbedded);
    finalDoc.addPage(basePage1);

    // Page 2
    const page2OverlayBytes = await page2OverlayDoc.save();
    const page2MarksBytes = await page2MarksDoc.save();

    const [page2Embedded] = await finalDoc.embedPdf(page2OverlayBytes);
    const [page2MarksEmbedded] = await finalDoc.embedPdf(page2MarksBytes);

    if (basePdfDoc.getPageCount() > 1) {
      const [basePage2] = await finalDoc.copyPages(basePdfDoc, [1]);
      basePage2.drawPage(page2Embedded);
      basePage2.drawPage(page2MarksEmbedded);
      finalDoc.addPage(basePage2);
    } else {
      // Template only has 1 page - create blank page with overlays
      const blankPage2 = finalDoc.addPage([612, 792]);
      blankPage2.drawPage(page2Embedded);
      blankPage2.drawPage(page2MarksEmbedded);
    }

    // Add page 3 if exists in template (declaration page)
    if (basePdfDoc.getPageCount() > 2) {
      const page3OverlayDoc = await PDFDocument.create();
      const page3Overlay = page3OverlayDoc.addPage([612, 792]);
      const font3 = await page3OverlayDoc.embedFont(StandardFonts.Helvetica);
      page3Overlay.setFont(font3);
      page3Overlay.setFontSize(9);

      // Add current date to bottom of page 3
      page3Overlay.drawText(formattedCurrentDate, { x: 500, y: 50, size: 9 });

      const page3OverlayBytes = await page3OverlayDoc.save();
      const [page3Embedded] = await finalDoc.embedPdf(page3OverlayBytes);
      const [basePage3] = await finalDoc.copyPages(basePdfDoc, [2]);

      basePage3.drawPage(page3Embedded);
      finalDoc.addPage(basePage3);
    }

    // Save PDF
    const pdfBytes = await finalDoc.save();

    return {
      filename,
      pdfBytes: Buffer.from(pdfBytes),
    };
  }
}
