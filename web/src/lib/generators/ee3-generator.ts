/**
 * EE-3 Form Generator
 * Converts Python ee3_generator.py to TypeScript
 * MOST COMPLEX: Multi-page with text wrapping, page-specific coordinate deltas, 3 employer sections
 */

import { PDFDocument, PDFPage, StandardFonts } from "pdf-lib";
import { BaseGenerator } from "./base-generator";
import { ClientRecord, GeneratorResult } from "./types";
import { formatDateMMDDYY, formatDateMMDDYYYY } from "./utils/formatters";

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
    super("EE-3.pdf");
  }

  /**
   * Wrap text into multiple lines with character limit
   * Returns empty array if text exceeds max_lines (warning logged)
   */
  private wrapText(
    text: string,
    maxCharsPerLine: number = 140,
    maxLines: number = 4
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
   * Draw a single employer section directly on a page
   */
  private drawEmployerSectionDirect(
    page: PDFPage,
    job: EE3EmploymentRecord,
    baseY: number,
    deltas: CoordinateDeltas,
    totalEmployers: number,
    pageNum: number
  ): void {
    // Parse dates
    let startDateStr = "";
    if (job.start_date) {
      const startDate = new Date(job.start_date);
      const month = String(startDate.getMonth() + 1).padStart(2, "0");
      const day = String(startDate.getDate()).padStart(2, "0");
      const year = String(startDate.getFullYear());
      startDateStr = `${month}/${day}/${year}`;
    }

    let endDateStr = "";
    if (job.end_date) {
      const endDate = new Date(job.end_date);
      const month = String(endDate.getMonth() + 1).padStart(2, "0");
      const day = String(endDate.getDate()).padStart(2, "0");
      const year = String(endDate.getFullYear());
      endDateStr = `${month}/${day}/${year}`;
    }

    // Dates section
    const datesY = baseY + deltas.dates;
    if (startDateStr) {
      const [month, day, year] = startDateStr.split("/");
      page.drawText(month, { x: 175, y: datesY, size: 9 });
      page.drawText(day, { x: 205, y: datesY, size: 9 });
      page.drawText(year, { x: 230, y: datesY, size: 9 });
    }

    if (endDateStr) {
      const [month, day, year] = endDateStr.split("/");
      page.drawText(month, { x: 360, y: datesY, size: 9 });
      page.drawText(day, { x: 390, y: datesY, size: 9 });
      page.drawText(year, { x: 415, y: datesY, size: 9 });
    }

    // Facility information
    const facilityY = baseY + deltas.facility;
    page.drawText(job.facility_name, { x: 30, y: facilityY, size: 9 });
    page.drawText(job.specific_location, { x: 265, y: facilityY, size: 9 });

    // City/State
    const cityState = `${job.city}, ${job.state}`;
    page.drawText(cityState, { x: 435, y: facilityY, size: 9 });

    // Contractor/sub-contractor
    const contractorY = baseY + deltas.contractor;
    page.drawText(job.contractor, { x: 30, y: contractorY, size: 9 });

    // Position Title
    const positionY = baseY + deltas.position;
    page.drawText(job.position_title, { x: 30, y: positionY, size: 9 });

    // Union Member checkbox
    const unionMember = job.union_member || false;
    if (deltas.union_checkbox !== undefined && unionMember) {
      const unionCheckboxY = baseY + deltas.union_checkbox;
      page.drawText("X", { x: 204, y: unionCheckboxY, size: 10 });
    }

    // Dosimeter Badge Worn checkbox
    const dosimetryWorn = job.dosimetry_worn || false;
    if (deltas.dosimetry_checkbox !== undefined && dosimetryWorn) {
      const dosimetryCheckboxY = baseY + deltas.dosimetry_checkbox;
      page.drawText("X", { x: 442, y: dosimetryCheckboxY, size: 10 });
    }

    // Facility Type Checkboxes - Department of Energy Facility
    if (deltas.facility_checkbox !== undefined) {
      const facilityCheckboxY = baseY + deltas.facility_checkbox;
      // Department of Energy Facility checkbox - always mark
      page.drawText("X", { x: 238, y: facilityCheckboxY, size: 10 });
    }

    // Description of Work Duties
    const dutiesY = baseY + deltas.duties;
    const duties = job.work_duties;
    const dutiesLines = this.wrapText(duties);

    // Only add work duties if they fit within the line limit
    if (dutiesLines.length > 0) {
      let yPosition = dutiesY;
      for (const line of dutiesLines) {
        page.drawText(line, { x: 20, y: yPosition, size: 9 });
        yPosition -= 12; // Move down 12 points for next line
      }
    }

    // Work conditions/exposures - only for page 2
    if (deltas.exposures !== undefined) {
      const exposuresY = baseY + deltas.exposures;
      const exposuresText =
        "Claimant stated they were exposed to radiation, silica dust, and other chemicals, solvents and contaminants during the course of their employment.";
      const exposuresLines = this.wrapText(exposuresText);

      if (exposuresLines.length > 0) {
        let yPosition = exposuresY;
        for (const line of exposuresLines) {
          page.drawText(line, { x: 20, y: yPosition, size: 9 });
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
    const firstName = formData.first_name || "";
    const lastName = formData.last_name || "";
    const name = lastName && firstName ? `${lastName}, ${firstName}` : "";
    const formerName = formData.former_name || "";
    const ssn = formData.ssn || "";
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
      facility: -42,
      contractor: -87,
      position: -119,
      facility_checkbox: -70,
      union_checkbox: -420,
      dosimetry_checkbox: -114,
      duties: -180,
      exposures: -286,
    };

    const page2Employer2Deltas: CoordinateDeltas = {
      dates: 0,
      facility: -38,
      contractor: -79,
      position: -108,
      duties: -160,
      exposures: -212,
      facility_checkbox: -65,
      union_checkbox: -282,
      dosimetry_checkbox: -107,
    };

    const page2Employer3Deltas: CoordinateDeltas = {
      dates: 0,
      facility: -37,
      contractor: -80,
      position: -110,
      duties: -163,
      exposures: -213,
      facility_checkbox: -66,
      union_checkbox: -286,
      dosimetry_checkbox: -109,
    };

    // Define employer positions
    interface EmployerPosition {
      page: number;
      baseY: number;
      deltas: CoordinateDeltas;
    }

    const employerPositions: EmployerPosition[] = [
      { page: 0, baseY: 468, deltas: page1Deltas }, // Employer 1 - Page 1
      { page: 1, baseY: 761, deltas: page2Employer2Deltas }, // Employer 2 - Page 2 top
      { page: 1, baseY: 460, deltas: page2Employer3Deltas }, // Employer 3 - Page 2 bottom
    ];

    const formattedCurrentDate = formatDateMMDDYYYY();

    // Instead of creating separate overlay documents and embedding them,
    // we'll copy the template pages and draw directly on them
    const finalDoc = await PDFDocument.create();

    // Copy all pages from base template
    const copiedPages = await finalDoc.copyPages(
      basePdfDoc,
      basePdfDoc.getPageIndices()
    );

    // Page 1
    const page1 = copiedPages[0];
    const font = await finalDoc.embedFont(StandardFonts.Helvetica);
    page1.setFont(font);

    // Copy all the drawing operations from page1Overlay to page1
    page1.drawText(name, { x: 30, y: 640, size: 9 });
    if (formerName) {
      page1.drawText(formerName, { x: 250, y: 640, size: 9 });
    }
    page1.drawText(ssn, { x: 440, y: 640, size: 9 });

    // Draw employer 1 if exists
    if (employmentHistory.length > 0) {
      const position = employerPositions[0];
      this.drawEmployerSectionDirect(
        page1,
        employmentHistory[0],
        position.baseY,
        position.deltas,
        employmentHistory.length,
        position.page
      );
    }

    finalDoc.addPage(page1);

    // Page 2
    let page2: PDFPage;
    if (basePdfDoc.getPageCount() > 1) {
      page2 = copiedPages[1];
    } else {
      page2 = finalDoc.addPage([612, 792]);
    }

    page2.setFont(font);
    page2.drawText(formattedCurrentDate, { x: 385, y: 60, size: 9 });

    // Draw employers 2 and 3 if they exist
    for (let i = 1; i < employmentHistory.length && i < 3; i++) {
      const position = employerPositions[i];
      this.drawEmployerSectionDirect(
        page2,
        employmentHistory[i],
        position.baseY,
        position.deltas,
        employmentHistory.length,
        position.page
      );
    }

    finalDoc.addPage(page2);

    // Page 3 if exists
    if (basePdfDoc.getPageCount() > 2) {
      const page3 = copiedPages[2];
      page3.setFont(font);
      page3.drawText(formattedCurrentDate, { x: 500, y: 50, size: 9 });
      finalDoc.addPage(page3);
    }

    // Save PDF
    const pdfBytes = await finalDoc.save();

    return {
      filename,
      pdfBytes: Buffer.from(pdfBytes),
    };
  }
}
