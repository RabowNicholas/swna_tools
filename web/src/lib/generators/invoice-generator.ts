/**
 * Invoice Generator
 * Converts Python invoice_generator.py to TypeScript
 * NOTE: Generates Excel files, not PDFs
 */

import ExcelJS from 'exceljs';
import { readFile } from 'fs/promises';
import path from 'path';

export interface InvoiceItem {
  name: string;
  date: string;
}

export interface InvoiceFormData {
  invoice_date: string;
  case_id: string;
  invoice_number: string;
  client_name: string;
  address_main: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  fd_letter_date: string;
  ar_fee?: number;
  part_type: 'Part B' | 'Part E';
  awarded_amount: number;
  invoice_items: InvoiceItem[];
}

export interface InvoiceResult {
  filename: string;
  excelBytes: Buffer;
}

export class InvoiceGenerator {
  private templatePath: string;

  constructor() {
    this.templatePath = path.join(process.cwd(), 'public', 'templates', 'invoice.xlsx');
  }

  async generate(fields: InvoiceFormData): Promise<InvoiceResult> {
    // Load template
    const templateBuffer = await readFile(this.templatePath);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(new Uint8Array(templateBuffer).buffer);

    const worksheet = workbook.getWorksheet(1); // First worksheet

    if (!worksheet) {
      throw new Error('Template worksheet not found');
    }

    // Fill in basic fields
    worksheet.getCell('E3').value = fields.invoice_date;
    worksheet.getCell('E4').value = `${fields.case_id}-${fields.invoice_number}`;
    worksheet.getCell('E5').value = fields.case_id;
    worksheet.getCell('A10').value = fields.client_name;
    worksheet.getCell('A11').value = fields.address_main;
    worksheet.getCell('A12').value = `${fields.address_city}, ${fields.address_state} ${fields.address_zip}`;
    worksheet.getCell('D17').value = fields.fd_letter_date;

    const arFee = fields.ar_fee || 2;

    if (fields.part_type === 'Part B') {
      worksheet.getCell('A17').value = 'U.S. Department of Labor Part B Award';
      worksheet.getCell('B17').value = 150000;
      worksheet.getCell('E16').value = `${arFee}% AR Fee`;
    } else if (fields.part_type === 'Part E') {
      worksheet.getCell('A17').value = 'U.S. Department of Labor Part E';
      worksheet.getCell('B17').value = parseFloat(String(fields.awarded_amount));
    }

    // Calculate AR fee
    const b17Value = worksheet.getCell('B17').value as number;
    worksheet.getCell('E17').value = b17Value * (arFee / 100);

    // Invoice items
    const amountMap: Record<string, number> = {
      toupin: 200,
      herold: 200,
      klepper: 300,
      smith: 300,
    };

    const startRow = 20;
    const items = fields.invoice_items.slice(0, 8); // Max 8 items

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const serviceName = item.name;
      const serviceDate = item.date;
      const lowerName = serviceName.toLowerCase();

      let amount = 0;
      for (const [key, value] of Object.entries(amountMap)) {
        if (lowerName.includes(key)) {
          amount = value;
          break;
        }
      }

      // Handle discount items (negative amounts)
      if (lowerName.includes('discount')) {
        amount = amount ? -Math.abs(amount) : 0;
      }

      const row = startRow + i;
      worksheet.getCell(`A${row}`).value = serviceName;
      worksheet.getCell(`B${row}`).value = amount;
      // Don't set E column directly - let the formula calculate it
      // worksheet.getCell(`E${row}`).value = amount;
      worksheet.getCell(`D${row}`).value = serviceDate;
    }

    // Force Excel to recalculate formulas
    workbook.calcProperties.fullCalcOnLoad = true;

    // Generate Excel bytes
    const buffer = await workbook.xlsx.writeBuffer();

    // Format amount for filename
    const amount =
      fields.part_type === 'Part E' ? parseFloat(String(fields.awarded_amount)) : 150000;
    const amountStr =
      amount % 1000 !== 0 ? `$${(amount / 1000).toFixed(1)}k` : `$${Math.floor(amount / 1000)}k`;

    // Extract client short name
    const nameParts = fields.client_name.split(' ');
    const shortName = nameParts[nameParts.length - 1]; // Last name
    const firstInitial = fields.client_name[0]; // First initial
    const nameStr = `${firstInitial}. ${shortName}`;

    // Get today's date
    const today = new Date();
    const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}.${String(today.getFullYear()).slice(-2)}`;

    const filename = `Invoice ${fields.part_type} ${amountStr} ${nameStr} ${todayStr}.xlsx`;

    return {
      filename,
      excelBytes: Buffer.from(buffer),
    };
  }
}
