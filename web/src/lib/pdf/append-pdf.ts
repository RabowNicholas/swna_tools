import { PDFDocument } from "pdf-lib";
import { fitPageToLetter } from "./page-size";

/**
 * Appends every page of `extra` after the pages of `base` and returns the
 * combined PDF, with every page fitted to US Letter. Runs in the browser, so
 * a large scanned attachment never has to be uploaded to the server (Vercel
 * caps request bodies at 4.5 MB).
 *
 * Throws a readable error if `extra` can't be opened as a PDF.
 */
export async function appendPdf(
  base: ArrayBuffer | Uint8Array,
  extra: ArrayBuffer | Uint8Array,
  extraLabel: string
): Promise<Uint8Array> {
  const combined = await PDFDocument.load(base);

  let attachment: PDFDocument;
  try {
    // Scanner software often marks PDFs as encrypted with no password; the
    // pages still copy cleanly.
    attachment = await PDFDocument.load(extra, { ignoreEncryption: true });
  } catch {
    throw new Error(
      `Couldn't read the ${extraLabel}. Make sure it's a PDF that opens normally.`
    );
  }

  const pages = await combined.copyPages(
    attachment,
    attachment.getPageIndices()
  );
  pages.forEach((page) => combined.addPage(page));
  combined.getPages().forEach(fitPageToLetter);

  return combined.save();
}
