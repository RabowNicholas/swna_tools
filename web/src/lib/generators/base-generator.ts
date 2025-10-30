/**
 * Base class for all PDF generators
 * Provides common utilities for loading templates and drawing text
 */

import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import { readFile } from 'fs/promises';
import path from 'path';
import { GeneratorResult, TextDrawOptions } from './types';

export abstract class BaseGenerator {
  protected templatePath: string;

  constructor(templateName: string) {
    // Templates are in public/templates directory
    this.templatePath = path.join(process.cwd(), 'public', 'templates', templateName);
  }

  /**
   * Load the PDF template
   */
  protected async loadTemplate(): Promise<PDFDocument> {
    try {
      const templateBytes = await readFile(this.templatePath);
      return await PDFDocument.load(templateBytes);
    } catch (error) {
      throw new Error(
        `Failed to load template at ${this.templatePath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Draw text on a PDF page at specified coordinates
   * Note: PDF coordinate system has origin at bottom-left, Y increases upward
   */
  protected drawText(
    page: PDFPage,
    text: string,
    options: TextDrawOptions
  ): void {
    const {
      x,
      y,
      size = 12,
      color = [0, 0, 0], // Black by default
    } = options;

    page.drawText(text, {
      x,
      y,
      size,
      color: rgb(color[0], color[1], color[2]),
    });
  }

  /**
   * Abstract method that each generator must implement
   */
  abstract generate(
    clientRecord: any,
    doctor: string,
    formData: any
  ): Promise<GeneratorResult>;
}
