/**
 * Merging the supplied documents into one claim PDF.
 *
 * Runs in the browser: claimant medical records are read from local files and
 * never leave the machine, and there's no request-size ceiling to hit.
 */

import { PDFDocument } from 'pdf-lib';

export interface AssemblyInput {
  /** Matches the DocumentSlot it came from */
  slotId: string;
  label: string;
  bytes: ArrayBuffer;
}

/** Where a source document ended up in the assembled claim (1-indexed, inclusive). */
export interface PageRange {
  slotId: string;
  label: string;
  startPage: number;
  endPage: number;
}

export interface AssemblyResult {
  pdfBytes: Uint8Array;
  pageCount: number;
  ranges: PageRange[];
}

export class AssemblyError extends Error {
  constructor(
    message: string,
    /** The document that couldn't be read, so the UI can point at the right slot */
    readonly slotId: string
  ) {
    super(message);
    this.name = 'AssemblyError';
  }
}

/**
 * Stack the documents in the order given and report where each one landed.
 *
 * The page ranges are what lets an assembler check the result at a glance
 * without paging through the whole claim.
 */
export async function assembleClaim(inputs: AssemblyInput[]): Promise<AssemblyResult> {
  if (inputs.length === 0) {
    throw new Error('No documents to assemble');
  }

  const output = await PDFDocument.create();
  const ranges: PageRange[] = [];

  for (const input of inputs) {
    let source: PDFDocument;
    try {
      source = await PDFDocument.load(input.bytes);
    } catch {
      throw new AssemblyError(
        `${input.label} could not be read as a PDF. It may be corrupt or password protected.`,
        input.slotId
      );
    }

    const indices = source.getPageIndices();
    if (indices.length === 0) {
      throw new AssemblyError(`${input.label} has no pages.`, input.slotId);
    }

    const startPage = output.getPageCount() + 1;
    const copied = await output.copyPages(source, indices);
    copied.forEach((page) => output.addPage(page));

    ranges.push({
      slotId: input.slotId,
      label: input.label,
      startPage,
      endPage: output.getPageCount(),
    });
  }

  return {
    pdfBytes: await output.save(),
    pageCount: output.getPageCount(),
    ranges,
  };
}

/** "1", or "3–4" for a multi-page document. */
export function formatPageRange({ startPage, endPage }: PageRange): string {
  return startPage === endPage ? `${startPage}` : `${startPage}–${endPage}`;
}
