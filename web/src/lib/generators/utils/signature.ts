/**
 * Signature image placement
 *
 * Uploaded signatures arrive in wildly different shapes: phone photos with
 * large paper margins, tightly cropped transparent PNGs, full-page scans.
 * Drawing those images as-is puts the ink in a different spot on every form,
 * and opaque photo backgrounds paint over the form text underneath.
 *
 * So before drawing, the image is normalized:
 *   1. EXIF orientation is applied (phone photos)
 *   2. the image is cropped down to the ink itself
 *   3. the paper background is turned transparent
 * and only then is it fitted to the signature rule it belongs on.
 */

import sharp from 'sharp';
import { PDFDocument, PDFPage } from 'pdf-lib';

/**
 * A printed signature rule on a form template, in PDF points.
 * Coordinates are measured off the template itself (origin bottom-left).
 */
export interface SignatureLine {
  /** Left end of the printed rule */
  x0: number;
  /** Right end of the printed rule */
  x1: number;
  /** Y of the printed rule */
  y: number;
  /** Most vertical space the ink may occupy above the rule */
  maxHeight: number;
  /** Fraction of the rule width the ink may span (default 0.95) */
  widthRatio?: number;
  /** Space left between the bottom of the ink and the rule (default 1.5) */
  gap?: number;
}

/** Ink is anything darker than this far into the ink→paper range. */
const INK_THRESHOLD = 0.6;
/** Fully opaque at/below this point in the ink→paper range. */
const OPAQUE_BELOW = 0.35;
/** Fully transparent at/above this point in the ink→paper range. */
const TRANSPARENT_ABOVE = 0.85;
/** Contrast below this (out of 255) means the image has no usable ink. */
const MIN_CONTRAST = 40;
/** Cap the normalized image so the alpha pass stays cheap. */
const MAX_PIXELS_WIDE = 1600;
/** Ink bounds are found on a copy no wider than this, to bound the work. */
const ANALYSIS_WIDTH = 900;
/**
 * A dark region reaching the edge of the frame is background (desk, shadow,
 * page border) rather than handwriting once it is thicker than this share of
 * the frame. Pen strokes stay far under it even for thick markers.
 */
const BACKGROUND_THICKNESS = 0.03;
/** Dark regions smaller than this share of the frame are scanner noise. */
const NOISE_AREA = 0.00002;

/**
 * Crop an image down to its ink and make the paper background transparent.
 * Returns a PNG buffer, or null if the image has no discernible ink.
 *
 * Exported because the doctor letter needs the same treatment for a signature that ships
 * with the app rather than one a user uploads: Dr. Toupin's signature on file is a scan on
 * solid white, which would paint a box over the signature line if drawn as-is.
 */
export async function isolateInk(buffer: Buffer): Promise<Buffer | null> {
  // Pass 1: normalize orientation and flatten any existing transparency onto
  // white, so the analysis below sees the same thing a human sees.
  const normalized = await sharp(buffer)
    .rotate()
    .flatten({ background: '#ffffff' })
    .toBuffer();
  const fullSize = await sharp(normalized).metadata();
  if (!fullSize.width || !fullSize.height) return null;

  // Ink bounds are measured on a downscaled greyscale copy: the work stays
  // bounded no matter how large the upload is, and scanning noise averages out.
  const { data, info } = await sharp(normalized)
    .greyscale()
    .resize({ width: Math.min(fullSize.width, ANALYSIS_WIDTH), fit: 'inside', withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Measured levels rather than fixed cutoffs, so an off-white phone photo and
  // a clean white scan both resolve to sensible ink/paper levels. Ink can be a
  // fraction of a percent of a large photo, so it is found by looking for the
  // darkest level that holds a meaningful number of pixels — not a percentile.
  const histogram = new Uint32Array(256);
  for (let i = 0; i < data.length; i++) histogram[data[i]]++;
  const paperLevel = dominantLevel(histogram);
  const inkLevel = darkestSignificantLevel(histogram, data.length);
  const range = paperLevel - inkLevel;
  if (range < MIN_CONTRAST) return null;

  const inkCutoff = inkLevel + range * INK_THRESHOLD;
  const bounds = inkBounds(data, info.width, info.height, inkCutoff);
  if (!bounds) return null;

  // Map the bounds back onto the full-resolution image, with a little padding
  // so anti-aliased stroke edges aren't clipped.
  const scale = fullSize.width / info.width;
  const padding = Math.max(1, Math.round(Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 0.02));
  const minX = Math.max(0, Math.round((bounds.minX - padding) * scale));
  const minY = Math.max(0, Math.round((bounds.minY - padding) * scale));
  const maxX = Math.min(fullSize.width - 1, Math.round((bounds.maxX + padding) * scale));
  const maxY = Math.min(fullSize.height - 1, Math.round((bounds.maxY + padding) * scale));

  // Pass 2: crop to the ink, downscale if oversized, then rebuild as
  // ink-on-transparent so the form text underneath stays readable.
  let cropped = sharp(normalized).extract({
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  });
  if (maxX - minX + 1 > MAX_PIXELS_WIDE) {
    cropped = cropped.resize({ width: MAX_PIXELS_WIDE });
  }

  const croppedBuffer = await cropped.png().toBuffer();
  const rgb = await sharp(croppedBuffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const grey = await sharp(croppedBuffer)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Keep the original colour (blue pen stays blue) but drive alpha off the
  // grey level, so paper fades out and ink stays solid.
  const opaqueAt = inkLevel + range * OPAQUE_BELOW;
  const clearAt = inkLevel + range * TRANSPARENT_ABOVE;
  const channels = rgb.info.channels; // 1 for a greyscale source, 3 for colour
  const pixels = grey.info.width * grey.info.height;
  const rgba = Buffer.alloc(pixels * 4);
  for (let i = 0; i < pixels; i++) {
    const level = grey.data[i];
    const alpha =
      level <= opaqueAt ? 255 : level >= clearAt ? 0 : Math.round(((clearAt - level) / (clearAt - opaqueAt)) * 255);
    const red = rgb.data[i * channels];
    rgba[i * 4] = red;
    rgba[i * 4 + 1] = channels >= 3 ? rgb.data[i * channels + 1] : red;
    rgba[i * 4 + 2] = channels >= 3 ? rgb.data[i * channels + 2] : red;
    rgba[i * 4 + 3] = alpha;
  }

  return sharp(rgba, {
    raw: { width: grey.info.width, height: grey.info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

interface InkBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Bounding box of the handwriting in a greyscale image.
 *
 * Dark pixels alone aren't enough: a photo of a signed page on a desk has a
 * dark border, and uneven lighting leaves dark bands. Those are found by
 * grouping the dark pixels into regions and discarding any that reach the
 * edge of the frame and are too thick to be a pen stroke, plus any region
 * small enough to be scanner noise.
 */
function inkBounds(data: Buffer, width: number, height: number, cutoff: number): InkBounds | null {
  const total = width * height;
  const visited = new Uint8Array(total);
  const stack = new Int32Array(total);
  const all: InkBounds = { minX: width, minY: height, maxX: -1, maxY: -1 };
  const kept: InkBounds = { minX: width, minY: height, maxX: -1, maxY: -1 };

  for (let seed = 0; seed < total; seed++) {
    if (visited[seed] || data[seed] >= cutoff) continue;

    // Flood fill this region (4-connectivity)
    let top = 0;
    stack[top++] = seed;
    visited[seed] = 1;
    let area = 0;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let touchesEdge = false;

    while (top > 0) {
      const idx = stack[--top];
      const x = idx % width;
      const y = (idx - x) / width;
      area++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesEdge = true;

      if (x > 0 && !visited[idx - 1] && data[idx - 1] < cutoff) { visited[idx - 1] = 1; stack[top++] = idx - 1; }
      if (x < width - 1 && !visited[idx + 1] && data[idx + 1] < cutoff) { visited[idx + 1] = 1; stack[top++] = idx + 1; }
      if (y > 0 && !visited[idx - width] && data[idx - width] < cutoff) { visited[idx - width] = 1; stack[top++] = idx - width; }
      if (y < height - 1 && !visited[idx + width] && data[idx + width] < cutoff) { visited[idx + width] = 1; stack[top++] = idx + width; }
    }

    if (area <= Math.max(4, total * NOISE_AREA)) continue;
    grow(all, minX, minY, maxX, maxY);

    // Area over span approximates how thick the region is: a pen stroke is a
    // long thin line, a desk border or shadow band is not.
    const thickness = area / Math.hypot(maxX - minX + 1, maxY - minY + 1);
    const isBackground = touchesEdge && thickness > Math.max(width, height) * BACKGROUND_THICKNESS;
    if (!isBackground) grow(kept, minX, minY, maxX, maxY);
  }

  // If every region looked like background, the image is probably a tight crop
  // whose strokes run off the edge — use everything rather than nothing.
  const result = kept.maxX >= 0 ? kept : all;
  return result.maxX >= 0 ? result : null;
}

function grow(box: InkBounds, minX: number, minY: number, maxX: number, maxY: number): void {
  if (minX < box.minX) box.minX = minX;
  if (minY < box.minY) box.minY = minY;
  if (maxX > box.maxX) box.maxX = maxX;
  if (maxY > box.maxY) box.maxY = maxY;
}

/** Most common grey level — the paper, which always dominates the frame. */
function dominantLevel(histogram: Uint32Array): number {
  let best = 0;
  for (let level = 1; level < 256; level++) {
    if (histogram[level] > histogram[best]) best = level;
  }
  return best;
}

/**
 * Darkest grey level backed by enough pixels to be ink rather than noise.
 * A signature can be well under 1% of a phone photo, so this is deliberately
 * a small absolute count instead of a percentile.
 */
function darkestSignificantLevel(histogram: Uint32Array, total: number): number {
  const minPixels = Math.max(20, Math.round(total * 0.0002));
  let seen = 0;
  for (let level = 0; level < 256; level++) {
    seen += histogram[level];
    if (seen >= minPixels) return level;
  }
  return 0;
}

/**
 * Draw an uploaded signature onto a form's signature rule.
 *
 * The ink is scaled to fit the rule, centered along it, and seated just above
 * it — so the result lands in the same place regardless of how the signature
 * was captured.
 */
export async function drawSignatureOnLine(
  pdfDoc: PDFDocument,
  page: PDFPage,
  base64Data: string,
  line: SignatureLine
): Promise<void> {
  const original = Buffer.from(base64Data, 'base64');

  let imageBuffer: Buffer = original;
  let isPng = original[0] === 0x89 && original[1] === 0x50; // PNG magic bytes
  try {
    const ink = await isolateInk(original);
    if (ink) {
      imageBuffer = ink;
      isPng = true;
    }
  } catch (error) {
    // Fall back to the untrimmed upload — placement is still deterministic,
    // it just includes whatever margins the original image had.
    console.error('[signature] Ink isolation failed, using original image:', error);
  }

  const image = isPng ? await pdfDoc.embedPng(imageBuffer) : await pdfDoc.embedJpg(imageBuffer);

  const ruleWidth = line.x1 - line.x0;
  const maxWidth = ruleWidth * (line.widthRatio ?? 0.95);
  const scale = Math.min(maxWidth / image.width, line.maxHeight / image.height);
  const width = image.width * scale;
  const height = image.height * scale;

  page.drawImage(image, {
    x: line.x0 + (ruleWidth - width) / 2,
    y: line.y + (line.gap ?? 1.5),
    width,
    height,
  });
}
