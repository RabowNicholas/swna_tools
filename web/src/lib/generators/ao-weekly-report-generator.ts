import ExcelJS from 'exceljs';

export interface AOWeeklyReportRow {
  name: string;
  caseId: string;
  matchedTags: string[];
  lastUpdate: string;
}

export interface AOWeeklyReportResult {
  filename: string;
  excelBytes: Buffer;
}

export class AOWeeklyReportGenerator {
  async generate(rows: AOWeeklyReportRow[]): Promise<AOWeeklyReportResult> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('AO Weekly Report');

    worksheet.columns = [
      { header: 'Client', key: 'client', width: 28 },
      { header: 'Case ID', key: 'caseId', width: 16 },
      { header: 'Event', key: 'event', width: 24 },
      { header: 'Date', key: 'date', width: 14 },
    ];
    worksheet.getRow(1).font = { bold: true };

    for (const row of rows) {
      worksheet.addRow({
        client: row.name,
        caseId: row.caseId,
        event: row.matchedTags.join(', '),
        date: row.lastUpdate,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    const today = new Date();
    const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}.${String(today.getFullYear()).slice(-2)}`;
    const filename = `AO_Weekly_Report_${todayStr}.xlsx`;

    return {
      filename,
      excelBytes: Buffer.from(buffer),
    };
  }
}
