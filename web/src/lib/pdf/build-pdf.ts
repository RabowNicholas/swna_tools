import { PDFDocument } from 'pdf-lib';
import { fitPageToLetter } from './page-size';
import { addScanPage, type ScanOptions } from '@/lib/scan/scan-look';

/** One page of the PDF being built: a photo to scan, or a page of a PDF */
export type BuildPage =
  | { kind: 'photo'; bitmap: ImageBitmap }
  | { kind: 'pdf'; bytes: ArrayBuffer; index: number };

/**
 * One PDF with the pages in order. Photos get the scanned look; PDF pages are
 * copied as they are and fitted to US Letter, like the other tools that
 * stack PDFs together. Runs in the browser, so nothing is uploaded.
 */
export async function buildPdf(pages: BuildPage[], opts: ScanOptions): Promise<Blob> {
  const pdf = await PDFDocument.create();
  // Each source PDF is opened once, however many of its pages are used
  const opened = new Map<ArrayBuffer, PDFDocument>();

  for (const page of pages) {
    if (page.kind === 'photo') {
      await addScanPage(pdf, page.bitmap, opts);
      continue;
    }
    let source = opened.get(page.bytes);
    if (!source) {
      // Scanner software often marks PDFs as encrypted with no password; the
      // pages still copy cleanly.
      source = await PDFDocument.load(page.bytes, { ignoreEncryption: true });
      opened.set(page.bytes, source);
    }
    const [copied] = await pdf.copyPages(source, [page.index]);
    fitPageToLetter(copied);
    pdf.addPage(copied);
  }

  return new Blob([(await pdf.save()) as BlobPart], { type: 'application/pdf' });
}
