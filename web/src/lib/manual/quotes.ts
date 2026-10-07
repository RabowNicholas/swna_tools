import type { ManualMeta, ManualUnit } from './types';

/** The line pasted under a quote in a letter. */
export function citationLine(unit: ManualUnit, meta: ManualMeta): string {
  const where = unit.kind === 'exhibit' ? unit.cite : `Chapter ${unit.cite}`;
  const [month, , year] = meta.published.split(/[\s,]+/);
  return `${meta.title}, ${where} (Version ${meta.version}, ${month} ${year})`;
}

/** Text placed on the clipboard by "Copy quote": the verbatim words, then the cite. */
export function quoteForLetter(text: string, unit: ManualUnit, meta: ManualMeta): string {
  const body = text.trim().replace(/\s*\n\s*\n\s*/g, '\n\n');
  return `“${body}”\n${citationLine(unit, meta)}`;
}

// Comparison form: ignore whitespace, quote style and dash style, which vary
// between the PDF, the browser selection and model output.
function normalize(s: string): string {
  return s
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** True if `quote` appears word-for-word in one of `units`. */
export function isVerbatim(quote: string, units: ManualUnit[]): boolean {
  const q = normalize(quote).replace(/^\.{3}|\.{3}$/g, '').replace(/[.,;:]$/, '').trim();
  if (!q) return false;
  return units.some((u) => normalize(u.text).includes(q));
}

/**
 * Check every quotation in an AI answer against the source text. Quotes that
 * don't match word-for-word lose their quotation marks and are marked as a
 * paraphrase, so nothing invented is ever presented as the manual's words.
 */
export function enforceVerbatimQuotes(answer: string, units: ManualUnit[]): string {
  return answer.replace(/[“"]([^“”"\n]{20,}?)[”"]/g, (match, inner: string) =>
    isVerbatim(inner, units) ? `“${inner}”` : `${inner} (paraphrase)`,
  );
}
