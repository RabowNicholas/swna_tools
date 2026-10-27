// Reads a PDF the user dropped in, in the browser: how many pages it has and
// a small picture of each, so its pages can be shown and shuffled alongside
// photos. pdf.js is loaded only when a PDF actually comes in.

export interface PdfSource {
  name: string;
  bytes: ArrayBuffer;
  /** One PNG data URL per page, in order */
  thumbs: string[];
}

async function pdfjs() {
  const lib = await import('pdfjs-dist');
  lib.GlobalWorkerOptions.workerSrc ||= new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  return lib;
}

/**
 * Opens the file and draws every page `width` pixels wide. Throws a readable
 * error if it isn't a PDF that opens, or it needs a password.
 */
export async function readPdf(file: File, width: number): Promise<PdfSource> {
  const bytes = await file.arrayBuffer();
  const lib = await pdfjs();
  // pdf.js takes ownership of the data it's given, so hand it a copy
  const task = lib.getDocument({ data: bytes.slice(0) });
  const doc = await task.promise.catch((e: unknown) => {
    const locked = e instanceof Error && e.name === 'PasswordException';
    throw new Error(locked ? 'this PDF needs a password to open.' : 'this doesn’t open as a PDF.');
  });

  try {
    const thumbs: string[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: width / base.width });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await page.render({ canvas, viewport }).promise;
      thumbs.push(canvas.toDataURL('image/png'));
    }
    return { name: file.name, bytes, thumbs };
  } finally {
    await task.destroy();
  }
}
