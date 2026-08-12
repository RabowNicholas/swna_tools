/**
 * Rich-text flow for letters drawn directly with pdf-lib.
 *
 * pdf-lib draws strings at coordinates; it has no concept of a paragraph, a line break or a
 * page boundary. This supplies the missing layer: paragraphs made of styled runs, wrapped on
 * real font metrics, flowed down a page and continued onto fresh pages as they fill.
 *
 * Wrapping measures with `font.widthOfTextAtSize()` rather than counting characters, so a
 * line of "W"s and a line of "i"s are not treated as the same length. That matters here
 * because the values substituted into these letters — names, facilities, verbatim B-read
 * impressions — vary enormously in width, and the letter has to reflow correctly for all of
 * them without anyone opening Word.
 */

import { PDFFont, PDFPage, RGB, rgb } from 'pdf-lib';

/** A styled span of text inside a paragraph. */
export interface TextRun {
  text: string;
  font: PDFFont;
  size: number;
  /** Baseline offset in points. Positive lifts, for footnote markers. */
  rise?: number;
  underline?: boolean;
  color?: RGB;
}

/** One wrapped line: the runs that landed on it, already split at the wrap points. */
interface Line {
  segments: TextRun[];
  width: number;
}

/**
 * pdf-lib's standard fonts encode WinAnsi (CP1252) and throw on anything outside it. Text
 * in these letters is partly pasted in by hand — a B-read impression copied out of a PDF
 * routinely carries non-breaking spaces or a stray en-space — and an uncaught throw there
 * would fail the whole letter with a stack trace.
 *
 * Characters with an exact CP1252 equivalent are folded to it. Anything left is reported by
 * name rather than silently dropped or substituted: these letters quote the B-read verbatim
 * as a matter of record, so quietly altering a character is worse than refusing to print.
 */
const WINANSI_FOLDS: Record<string, string> = {
  ' ': ' ', // no-break space
  ' ': ' ', // en space
  ' ': ' ', // em space
  ' ': ' ',
  ' ': ' ',
  ' ': ' ',
  ' ': ' ',
  ' ': ' ',
  ' ': ' ', // thin space
  ' ': ' ', // hair space
  '​': '', // zero-width space
  ' ': ' ', // narrow no-break space
  '‑': '-', // non-breaking hyphen
  '‒': '–', // figure dash
  '―': '—', // horizontal bar
  '−': '-', // minus sign
  'ʼ': '’', // modifier apostrophe
  '­': '', // soft hyphen
};

/** CP1252 additions in the 0x80-0x9F range, which is unmapped in Latin-1. */
const CP1252_HIGH = new Set(
  [
    0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030,
    0x0160, 0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022,
    0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
  ]
);

function encodable(codePoint: number): boolean {
  if (codePoint === 0x0a || codePoint === 0x0d) return true;
  if (codePoint >= 0x20 && codePoint <= 0x7e) return true;
  if (codePoint >= 0xa0 && codePoint <= 0xff) return true;
  return CP1252_HIGH.has(codePoint);
}

export function sanitizeForWinAnsi(text: string): string {
  let out = '';
  for (const char of text) {
    const folded = WINANSI_FOLDS[char];
    const candidate = folded !== undefined ? folded : char;
    if (candidate === '') continue;
    const codePoint = candidate.codePointAt(0)!;
    if (!encodable(codePoint)) {
      throw new Error(
        `Cannot print the character "${candidate}" (U+${codePoint
          .toString(16)
          .toUpperCase()
          .padStart(4, '0')}). Retype it or remove it and generate again.`
      );
    }
    out += candidate;
  }
  return out;
}

export interface Paragraph {
  runs: TextRun[];
  /**
   * Drawn once at `indent` on the first line, outside the text column. The text itself
   * starts at `hangingIndent` on every line including the first, so a bullet's wrapped
   * lines align under the text rather than under the glyph — and the alignment does not
   * depend on the marker's width.
   */
  marker?: TextRun;
  /** Left offset from the flow's x origin, where the marker is drawn. */
  indent?: number;
  /** Left offset of the text column itself. Defaults to `indent`. */
  hangingIndent?: number;
  /** Vertical gap left below this paragraph, in points. */
  spaceAfter?: number;
  /** Line height override. Defaults to the flow's. */
  lineHeight?: number;
}

/**
 * Splits text into words plus their trailing whitespace, so that measuring a line includes
 * the spaces between words but a trailing space at a wrap point can be dropped.
 */
function tokenize(text: string): string[] {
  return text.match(/\S+\s*|\s+/g) ?? [];
}

const widthOf = (run: TextRun): number => run.font.widthOfTextAtSize(run.text, run.size);

/**
 * Wrap a paragraph's runs into lines that fit `firstWidth` / `restWidth`.
 *
 * Runs are flattened into a single token stream so a wrap can fall inside a run — the
 * footnote marker paragraph, for example, is one long body run followed by a superscript
 * and a closing bracket, and the break can land anywhere in it.
 */
export function wrapRuns(
  runs: TextRun[],
  firstWidth: number,
  restWidth: number
): Line[] {
  const lines: Line[] = [];
  let segments: TextRun[] = [];
  let width = 0;

  const limit = () => (lines.length === 0 ? firstWidth : restWidth);

  const flush = () => {
    // Drop trailing whitespace so it never pushes a line over the measured width.
    while (segments.length) {
      const last = segments[segments.length - 1];
      const trimmed = last.text.replace(/\s+$/, '');
      if (trimmed === last.text) break;
      if (trimmed === '') {
        segments.pop();
        continue;
      }
      segments[segments.length - 1] = { ...last, text: trimmed };
      break;
    }
    if (segments.length) {
      lines.push({
        segments,
        width: segments.reduce((sum, s) => sum + widthOf(s), 0),
      });
    }
    segments = [];
    width = 0;
  };

  for (const run of runs) {
    // Sanitized here so measuring and drawing operate on identical text.
    for (const token of tokenize(sanitizeForWinAnsi(run.text))) {
      // A pure-whitespace token at the start of a line is a wrap artefact; drop it.
      if (segments.length === 0 && /^\s+$/.test(token)) continue;

      const candidate: TextRun = { ...run, text: token };
      const tokenWidth = widthOf(candidate);

      if (segments.length > 0 && width + tokenWidth > limit()) {
        flush();
        if (/^\s+$/.test(token)) continue;
      }

      const previous = segments[segments.length - 1];
      // Merge adjacent tokens sharing a style into one draw call.
      if (
        previous &&
        previous.font === candidate.font &&
        previous.size === candidate.size &&
        previous.rise === candidate.rise &&
        previous.underline === candidate.underline &&
        previous.color === candidate.color
      ) {
        segments[segments.length - 1] = {
          ...previous,
          text: previous.text + candidate.text,
        };
      } else {
        segments.push(candidate);
      }
      width += tokenWidth;
    }
  }
  flush();

  return lines;
}

/** Convenience wrapper for plain single-style text. */
export function wrapToWidth(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  return wrapRuns([{ text, font, size }], maxWidth, maxWidth).map((line) =>
    line.segments.map((s) => s.text).join('')
  );
}

export interface FlowOptions {
  /** Left edge of the text column. */
  x: number;
  /** Width of the text column. */
  width: number;
  /** Baseline of the first line. */
  startY: number;
  /** Baseline a continuation page starts at. */
  continuationStartY: number;
  /** Lowest baseline a line may occupy before rolling to a new page. */
  bottom: number;
  lineHeight: number;
  /** Called when the flow needs another page. */
  addPage: () => PDFPage;
}

/**
 * Flows paragraphs down the page, adding pages as needed.
 *
 * Returns the page and baseline the flow ended on, so callers can pin a signature block
 * directly beneath the last line rather than at a fixed position.
 */
export class TextFlow {
  private page: PDFPage;
  private y: number;
  /** Lowest baseline drawn on each page, for callers placing content in the margins. */
  private readonly lowest = new Map<PDFPage, number>();

  constructor(page: PDFPage, private readonly options: FlowOptions) {
    this.page = page;
    this.y = options.startY;
  }

  /**
   * The lowest baseline any text reached on `page`, or null if nothing was drawn there.
   * A footnote drawn into the bottom margin uses this to confirm it will not collide with
   * the body above it.
   */
  lowestBaselineOn(page: PDFPage): number | null {
    return this.lowest.get(page) ?? null;
  }

  get currentPage(): PDFPage {
    return this.page;
  }

  get currentY(): number {
    return this.y;
  }

  /** Lowest baseline still available on the current page. */
  get bottom(): number {
    return this.options.bottom;
  }

  /** Move to a fresh page immediately. */
  breakPage(): void {
    this.page = this.options.addPage();
    this.y = this.options.continuationStartY;
  }

  /**
   * Reserve vertical space: if `height` will not fit below the current baseline, roll to a
   * new page first. Keeps a signature block from being split across pages.
   */
  reserve(height: number): void {
    if (this.y - height < this.options.bottom) this.breakPage();
  }

  /** Drop the baseline without drawing, e.g. for the gap a signature occupies. */
  advance(points: number): void {
    this.y -= points;
  }

  /**
   * Put the next baseline at an absolute y on the current page. Used where a block's
   * position is measured from a fixed point rather than accumulated line by line — the
   * signature image, whose height is not a multiple of the line height.
   */
  moveTo(y: number): void {
    if (y > this.y) {
      throw new Error(`moveTo(${y}) would move the cursor up from ${this.y}`);
    }
    this.y = y;
  }

  drawParagraph(paragraph: Paragraph): void {
    const indent = paragraph.indent ?? 0;
    const hanging = paragraph.hangingIndent ?? indent;
    const lineHeight = paragraph.lineHeight ?? this.options.lineHeight;

    const lines = wrapRuns(
      paragraph.runs,
      this.options.width - hanging,
      this.options.width - hanging
    );

    lines.forEach((line, index) => {
      if (this.y < this.options.bottom) this.breakPage();

      if (index === 0 && paragraph.marker) {
        this.page.drawText(sanitizeForWinAnsi(paragraph.marker.text), {
          x: this.options.x + indent,
          y: this.y + (paragraph.marker.rise ?? 0),
          size: paragraph.marker.size,
          font: paragraph.marker.font,
          color: paragraph.marker.color ?? rgb(0, 0, 0),
        });
      }

      const previousLowest = this.lowest.get(this.page);
      if (previousLowest === undefined || this.y < previousLowest) {
        this.lowest.set(this.page, this.y);
      }

      let x = this.options.x + hanging;
      for (const segment of line.segments) {
        const baseline = this.y + (segment.rise ?? 0);
        this.page.drawText(segment.text, {
          x,
          y: baseline,
          size: segment.size,
          font: segment.font,
          color: segment.color ?? rgb(0, 0, 0),
        });
        const segmentWidth = widthOf(segment);
        if (segment.underline) {
          // pdf-lib has no underline; draw the rule from the font's own metrics so it sits
          // the same distance below the baseline at any size.
          const thickness = Math.max(0.5, segment.size * 0.05);
          this.page.drawLine({
            start: { x, y: baseline - segment.size * 0.11 },
            end: { x: x + segmentWidth, y: baseline - segment.size * 0.11 },
            thickness,
            color: segment.color ?? rgb(0, 0, 0),
          });
        }
        x += segmentWidth;
      }
      this.y -= lineHeight;
    });

    if (paragraph.spaceAfter) this.y -= paragraph.spaceAfter;
  }

  drawParagraphs(paragraphs: Paragraph[]): void {
    for (const paragraph of paragraphs) this.drawParagraph(paragraph);
  }
}
