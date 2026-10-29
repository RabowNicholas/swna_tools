import ExcelJS from 'exceljs';
import { formatDateShort, formatRange } from '@/lib/reports/hhc-weekly-config';

export interface HHCWeeklyReportRow {
  name: string;
  caseId: string;
  matchedTags: string[];
  lastUpdate: string;
}

export interface HHCWeeklyReportInput {
  groupLabel: string;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  rows: HHCWeeklyReportRow[];
}

export interface HHCWeeklyReportResult {
  filename: string;
  excelBytes: Buffer;
}

export class HHCWeeklyReportGenerator {
  async generate({ groupLabel, from, to, rows }: HHCWeeklyReportInput): Promise<HHCWeeklyReportResult> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${groupLabel} Weekly Report`);

    // Title row naming the group and window, then a blank row, then the table
    worksheet.addRow([`${groupLabel} Weekly Report: ${formatRange(from, to)}`]).font = { bold: true, size: 13 };
    worksheet.addRow([]);

    const header = worksheet.addRow(['Client', 'Case ID', 'Event', 'Date']);
    header.font = { bold: true };

    for (const row of rows) {
      worksheet.addRow([row.name, row.caseId, row.matchedTags.join(', '), formatDateShort(row.lastUpdate)]);
    }

    [28, 16, 24, 14].forEach((width, i) => {
      worksheet.getColumn(i + 1).width = width;
    });

    const buffer = await workbook.xlsx.writeBuffer();

    const dotted = (iso: string) => formatDateShort(iso).replace(/\//g, '.');
    const filename = `${groupLabel}_Weekly_Report_${dotted(from)}-${dotted(to)}.xlsx`;

    return {
      filename,
      excelBytes: Buffer.from(buffer),
    };
  }
}
