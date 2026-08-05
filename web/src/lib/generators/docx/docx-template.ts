/**
 * Fills a tokenized .docx.
 *
 * Templates are produced by scripts/build-cs-template.mjs, which guarantees every token
 * sits inside a single <w:t>. That makes filling a plain string replace — no OOXML tree
 * walking, and no docxtemplater dependency for what is only text substitution.
 */

import { readFile } from 'fs/promises';
import path from 'path';
import PizZip from 'pizzip';

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export { DOCX_MIME };

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Word collapses a literal newline inside <w:t> to a space, so line breaks have to be
 * explicit. <w:br/> keeps the text in its original run, which inherits that run's
 * formatting — splicing in new <w:p> elements would drop the paragraph properties and
 * render the continuation in the default style.
 */
function multiline(value: string): string {
  return value
    .split(/\r?\n/)
    .map(escapeXml)
    .join('</w:t><w:br/><w:t xml:space="preserve">');
}

// Matches a whole <w:p> without spanning into the next one. Written with [\s\S] rather
// than the `s` flag, which needs an es2018 target.
const PARAGRAPH = /<w:p\b(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/g;

export async function loadDocxTemplate(templateName: string): Promise<Buffer> {
  const templatePath = path.join(
    process.cwd(),
    'public',
    'templates',
    templateName
  );
  try {
    return await readFile(templatePath);
  } catch (error) {
    throw new Error(
      `Failed to load template at ${templatePath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * @param templateBytes the tokenized template
 * @param values token name (without braces) -> replacement text
 * @param conditions IF-marker name -> whether to keep the paragraph carrying it
 */
export function fillDocx(
  templateBytes: Buffer,
  values: Record<string, string>,
  conditions: Record<string, boolean> = {}
): Buffer {
  const zip = new PizZip(templateBytes);
  let xml = zip.file('word/document.xml')!.asText();

  // Conditionals run first: a paragraph that's about to be dropped must not have its
  // tokens substituted, and dropping it afterwards would leave filled text behind.
  for (const [name, keep] of Object.entries(conditions)) {
    const marker = `{{IF:${name}}}`;
    if (keep) {
      xml = xml.split(marker).join('');
      continue;
    }
    xml = xml.replace(PARAGRAPH, (para) => (para.includes(marker) ? '' : para));
  }

  for (const [name, value] of Object.entries(values)) {
    xml = xml.split(`{{${name}}}`).join(multiline(value ?? ''));
  }

  // A token surviving here means the caller omitted a value the template needs. Failing
  // is better than handing a lawyer a letter with "{{DX_DATE}}" in the diagnosis line.
  const leftover = [...new Set(xml.match(/\{\{[^}]+\}\}/g) ?? [])];
  if (leftover.length) {
    throw new Error(`Unfilled template tokens: ${leftover.join(', ')}`);
  }

  zip.file('word/document.xml', xml);
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

/** "an" before a vowel sound, "a" otherwise. */
export function indefiniteArticle(noun: string): string {
  return /^[aeiou]/i.test(noun.trim()) ? 'an' : 'a';
}
