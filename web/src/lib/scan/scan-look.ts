// Turns photos of documents into pages that look like they came off a
// scanner: shadows and uneven lighting flattened out, then black and white
// (or clean grayscale), centered on a letter page. Runs in the browser, so
// the photos never leave the computer.
//
// Same steps as scripts/scan_to_pdf.py.

import {
  PDFDocument,
  PDFName,
  concatTransformationMatrix,
  drawObject,
  popGraphicsState,
  pushGraphicsState,
  type PDFPage,
} from 'pdf-lib';

export interface ScanOptions {
  /** Grayscale instead of pure black and white */
  gray: boolean;
  /** 0-255: anything darker than this turns black (black and white only) */
  threshold: number;
}

export const DEFAULT_THRESHOLD = 185;

/** Resolution of the PDF pages */
export const PDF_DPI = 200;

const LETTER_IN = [8.5, 11] as const;
const MARGIN_IN = 0.25;
/** Long side of the shrunken copy the lighting is measured on */
const BACKGROUND_SIDE = 128;

/** Decodes a photo, turned the right way up per the phone's orientation tag. */
export function loadPhoto(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: 'from-image' });
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function grayPixels(source: CanvasImageSource, w: number, h: number): Float32Array {
  const ctx = canvas(w, h).getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);
  const rgba = ctx.getImageData(0, 0, w, h).data;
  const out = new Float32Array(w * h);
  for (let i = 0; i < out.length; i++) {
    out[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
  }
  return out;
}

/** Fills an opaque gray image, one 0-255 value per pixel (clamped). */
function writeGray(img: ImageData, value: (i: number) => number) {
  // One 32-bit write per pixel; with alpha 255 the byte order doesn't matter
  const px = new Uint32Array(img.data.buffer);
  for (let i = 0; i < px.length; i++) {
    const v = Math.max(0, Math.min(255, value(i))) | 0;
    px[i] = 0xff000000 | (v << 16) | (v << 8) | v;
  }
}

/** One pass of a box blur along rows or columns, edges clamped. */
function boxBlur(src: Float32Array, w: number, h: number, r: number, horizontal: boolean) {
  const out = new Float32Array(src.length);
  const [lines, len] = horizontal ? [h, w] : [w, h];
  const at = (line: number, k: number) => (horizontal ? line * w + k : k * w + line);
  for (let line = 0; line < lines; line++) {
    for (let k = 0; k < len; k++) {
      let sum = 0;
      for (let d = -r; d <= r; d++) sum += src[at(line, Math.min(len - 1, Math.max(0, k + d)))];
      out[at(line, k)] = sum / (2 * r + 1);
    }
  }
  return out;
}

/**
 * The page's lighting with the writing blurred away: the photo shrunk, heavily
 * blurred (three box blurs ≈ a Gaussian), and stretched back to full size.
 */
function background(source: CanvasImageSource, w: number, h: number): Float32Array {
  const scale = BACKGROUND_SIDE / Math.max(w, h);
  const sw = Math.max(1, Math.round(w * scale));
  const sh = Math.max(1, Math.round(h * scale));
  let small = grayPixels(source, sw, sh);
  for (let pass = 0; pass < 3; pass++) {
    small = boxBlur(small, sw, sh, 3, true);
    small = boxBlur(small, sw, sh, 3, false);
  }

  const smallCanvas = canvas(sw, sh);
  const sctx = smallCanvas.getContext('2d')!;
  const img = sctx.createImageData(sw, sh);
  writeGray(img, (i) => small[i]);
  sctx.putImageData(img, 0, 0);
  return grayPixels(smallCanvas, w, h);
}

/** The photo at w×h with the scan look applied. */
function scanLook(source: CanvasImageSource, w: number, h: number, opts: ScanOptions): ImageData {
  const pixels = grayPixels(source, w, h);
  const bg = background(source, w, h);
  const out = new ImageData(w, h);

  // Dividing by the lighting turns the paper an even white
  const flat = new Float32Array(pixels.length);
  for (let i = 0; i < flat.length; i++) {
    flat[i] = Math.min(255, (pixels[i] / Math.max(bg[i], 1)) * 255);
  }

  if (opts.gray) {
    // Near-white paper goes pure white and the ink deepens
    writeGray(out, (i) => ((flat[i] - 90) * 255) / (235 - 90));
    return out;
  }

  const black = new Uint8Array(flat.length);
  for (let i = 0; i < flat.length; i++) black[i] = flat[i] < opts.threshold ? 1 : 0;

  // A pixel stays black only if most of its 3×3 neighborhood is, which
  // knocks out isolated specks
  const kept = new Uint8Array(black.length);
  for (let y = 0; y < h; y++) {
    const up = Math.max(0, y - 1) * w;
    const row = y * w;
    const down = Math.min(h - 1, y + 1) * w;
    for (let x = 0; x < w; x++) {
      const l = Math.max(0, x - 1);
      const r = Math.min(w - 1, x + 1);
      const count =
        black[up + l] + black[up + x] + black[up + r] +
        black[row + l] + black[row + x] + black[row + r] +
        black[down + l] + black[down + x] + black[down + r];
      kept[row + x] = count >= 5 ? 0 : 255;
    }
  }
  writeGray(out, (i) => kept[i]);
  return out;
}

/**
 * A full letter page at `dpi` with the photo scanned and centered on it.
 * Landscape photos get a landscape page.
 */
export function renderPage(photo: ImageBitmap, dpi: number, opts: ScanOptions): HTMLCanvasElement {
  const landscape = photo.width > photo.height;
  const [inW, inH] = landscape ? [LETTER_IN[1], LETTER_IN[0]] : LETTER_IN;
  const pageW = Math.round(inW * dpi);
  const pageH = Math.round(inH * dpi);
  const margin = Math.round(MARGIN_IN * dpi);

  const fit = Math.min((pageW - 2 * margin) / photo.width, (pageH - 2 * margin) / photo.height);
  const w = Math.max(1, Math.round(photo.width * fit));
  const h = Math.max(1, Math.round(photo.height * fit));

  const page = canvas(pageW, pageH);
  const ctx = page.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, pageW, pageH);
  ctx.putImageData(scanLook(photo, w, h, opts), Math.round((pageW - w) / 2), Math.round((pageH - h) / 2));
  return page;
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Puts a black and white page in as a 1-bit image, the way a scanner does:
 * crisp, and a fraction of the size of a JPEG. (pdf-lib's own PNG path
 * decodes in JavaScript and takes seconds a page.)
 */
async function drawBitonal(pdf: PDFDocument, pdfPage: PDFPage, page: HTMLCanvasElement) {
  const { width: w, height: h } = page;
  const rgba = page.getContext('2d')!.getImageData(0, 0, w, h).data;
  const rowBytes = Math.ceil(w / 8);
  // 1 = white, 0 = black; each row padded to a whole byte
  const bits = new Uint8Array(rowBytes * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rgba[(y * w + x) * 4] >= 128) bits[y * rowBytes + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  const image = pdf.context.register(
    pdf.context.stream(await deflate(bits), {
      Type: 'XObject',
      Subtype: 'Image',
      Width: w,
      Height: h,
      ColorSpace: 'DeviceGray',
      BitsPerComponent: 1,
      Filter: 'FlateDecode',
    })
  );
  const name = pdfPage.node.newXObject('Scan', image);
  const { width, height } = pdfPage.getSize();
  pdfPage.pushOperators(
    pushGraphicsState(),
    concatTransformationMatrix(width, 0, 0, height, 0, 0),
    drawObject(name as PDFName),
    popGraphicsState()
  );
}

/** Adds the photo to `pdf` as one scanned-look page. */
export async function addScanPage(pdf: PDFDocument, photo: ImageBitmap, opts: ScanOptions): Promise<void> {
  const page = renderPage(photo, PDF_DPI, opts);
  const pdfPage = pdf.addPage([(page.width / PDF_DPI) * 72, (page.height / PDF_DPI) * 72]);
  if (!opts.gray) {
    await drawBitonal(pdf, pdfPage, page);
    return;
  }
  // JPEG goes into the PDF as-is, with no decoding
  const blob = await new Promise<Blob>((resolve, reject) =>
    page.toBlob((b) => (b ? resolve(b) : reject(new Error('Couldn’t render a page'))), 'image/jpeg', 0.85)
  );
  const image = await pdf.embedJpg(new Uint8Array(await blob.arrayBuffer()));
  pdfPage.drawImage(image, { x: 0, y: 0, ...pdfPage.getSize() });
}
