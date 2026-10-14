/**
 * Keeps every page of a compiled PDF the same size.
 *
 * Scanned documents often come in at the scanner's pixel size (a 300 dpi scan
 * can be 2550×3300 pt rather than 612×792), so a compiled packet shows one
 * tiny page next to one huge one and faxes unevenly. Anything that stacks PDFs
 * together should run each page through `fitPageToLetter` as it's added.
 */

import { PDFPage } from "pdf-lib";

/** US Letter in points */
export const LETTER = { width: 612, height: 792 } as const;

// Pages within this many points of Letter are left untouched
const TOLERANCE = 1;

/**
 * Scales the page to fit US Letter, centred, keeping its aspect ratio and its
 * orientation (a landscape page becomes landscape Letter). Pages already at
 * Letter are left alone.
 *
 * Content and annotations are scaled in place rather than redrawn, so filled
 * form fields, links and text selection survive.
 */
export function fitPageToLetter(page: PDFPage): void {
  // The visible area is the crop box (which defaults to the media box)
  const box = page.getCropBox();
  const rotation = ((page.getRotation().angle % 360) + 360) % 360;
  const sideways = rotation === 90 || rotation === 270;

  // Pick the orientation from how the page is shown, then work in the page's
  // own unrotated space so /Rotate keeps doing its job
  const shownWidth = sideways ? box.height : box.width;
  const shownHeight = sideways ? box.width : box.height;
  const landscape = shownWidth > shownHeight;
  const shownTarget = landscape
    ? { width: LETTER.height, height: LETTER.width }
    : LETTER;
  const target = sideways
    ? { width: shownTarget.height, height: shownTarget.width }
    : shownTarget;

  const alreadyLetter =
    Math.abs(box.width - target.width) <= TOLERANCE &&
    Math.abs(box.height - target.height) <= TOLERANCE;
  if (alreadyLetter) return;

  const scale = Math.min(target.width / box.width, target.height / box.height);

  // Both scale about the origin, so the visible box moves with them
  page.scaleContent(scale, scale);
  page.scaleAnnotations(scale, scale);

  const scaledX = box.x * scale;
  const scaledY = box.y * scale;
  const padX = (target.width - box.width * scale) / 2;
  const padY = (target.height - box.height * scale) / 2;

  // Grow the box around the scaled content rather than moving the content, so
  // annotations stay lined up with what they sit on
  const x = scaledX - padX;
  const y = scaledY - padY;
  page.setMediaBox(x, y, target.width, target.height);
  page.setCropBox(x, y, target.width, target.height);
  page.setBleedBox(x, y, target.width, target.height);
  page.setTrimBox(x, y, target.width, target.height);
  page.setArtBox(x, y, target.width, target.height);
}
