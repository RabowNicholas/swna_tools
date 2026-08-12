/**
 * One-time preprocessor: extracts the Toupin letterhead from a sent letter.
 *
 * The letterhead heading is set in Castellar, a font bundled with Microsoft Office and not
 * installed on every machine. Rebuilding it from the .docx would therefore substitute the
 * typeface and produce a letterhead that doesn't match what DOL has been receiving. Taking
 * page 1 of a letter that actually went out sidesteps that entirely — the letterhead is
 * carried over as-is, glyphs already outlined by whatever produced the original PDF.
 *
 * Everything below the letterhead is painted out: the date, the claimant identifier block,
 * the DOL address and the body all vary per letter and are drawn by DoctorLetterGenerator.
 *
 * Run with no arguments to rebuild from the committed reference letter:
 *   node scripts/build-letterhead.mjs [source.pdf] [out.pdf]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, rgb } from "pdf-lib";

const here = dirname(fileURLToPath(import.meta.url));

const SRC =
  process.argv[2] ??
  resolve(
    process.env.HOME,
    "Library/CloudStorage/Sync/1. SWNA Shared Folder/2. Active Clients/White, Bryan K/Chronic Silicosis letter, B. White 04.6.26.pdf"
  );
const OUT =
  process.argv[3] ??
  resolve(here, "../public/templates/chronic-silicosis-toupin-letterhead.pdf");

/**
 * Measured off the reference letter (rendered at 1400px and scanned for content bands):
 * the letterhead's lowest ink is the NPI line at y=633, and the next content down is the
 * date / identifier band topping out at y=611. Cutting between them keeps the whole
 * letterhead and removes everything else.
 */
const CUT_Y = 622;

const EXPECTED_WIDTH = 612;
const EXPECTED_HEIGHT = 792;

const source = await PDFDocument.load(readFileSync(SRC));
const out = await PDFDocument.create();
const [page] = await out.copyPages(source, [0]);
out.addPage(page);

const { width, height } = page.getSize();
if (Math.round(width) !== EXPECTED_WIDTH || Math.round(height) !== EXPECTED_HEIGHT) {
  throw new Error(
    `Expected a ${EXPECTED_WIDTH}x${EXPECTED_HEIGHT} page, got ${width}x${height}. ` +
      `CUT_Y was measured against US Letter and would land in the wrong place.`
  );
}

// Paint from the cut line down to the bottom edge, full bleed.
page.drawRectangle({
  x: 0,
  y: 0,
  width,
  height: CUT_Y,
  color: rgb(1, 1, 1),
});

writeFileSync(OUT, await out.save());
console.log(`kept letterhead above y=${CUT_Y}`);
console.log(`wrote ${OUT}`);
