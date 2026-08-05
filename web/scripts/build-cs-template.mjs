/**
 * One-time preprocessor: converts the hand-fillable Chronic Silicosis letter into a
 * tokenized template the app can fill programmatically.
 *
 * The source .docx carries placeholders in two incompatible forms:
 *
 *   1. Word content controls (<w:sdt>) data-bound to document properties. Typing once
 *      updates all 33 occurrences. We identify these by their w:alias and unwrap them,
 *      because a delivered letter must not contain fields Word could refresh back to a
 *      stale document-property value.
 *
 *   2. Plain highlighted runs the drafter retypes by hand. Three separate fields are
 *      literally the string "XX", so these can only be told apart by position. That
 *      ambiguity is resolved here, once, offline — every ordinal is asserted against its
 *      expected literal so a template change fails loudly instead of silently mapping
 *      the impression text into the profusion slot.
 *
 * Output: a template whose every placeholder is a unique token inside a single <w:t>,
 * which makes runtime generation a plain string replace.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import PizZip from "pizzip";

const here = dirname(fileURLToPath(import.meta.url));

// Run with no arguments to rebuild the committed template from the committed source:
//   node scripts/build-cs-template.mjs
const SRC =
  process.argv[2] ??
  resolve(here, "source-templates/chronic-silicosis-toupin.source.docx");
const OUT =
  process.argv[3] ??
  resolve(here, "../public/templates/chronic-silicosis-toupin.docx");

/** Content-control alias -> replacement. Static values are inlined rather than tokenized. */
const SDT_ALIAS = {
  Abstract: "{{FIRST_MI}}",
  Category: "{{LAST_NAME}}",
  Comments: "{{TITLE}}",
  Company: "{{PRONOUN_POSS}}",
  Keywords: "{{FACILITY_ABBR}}",
  Status: "{{DX_DATE}}",
  // Always a possessive apostrophe. The source uses a left curly quote (U+2018),
  // which is a typo — a possessive takes a right quote.
  "Company E-mail": "’s",
};

/**
 * Highlighted runs that are NOT content controls, in document order.
 * `expect` is asserted before replacing. `null` deletes the run.
 *
 * Ordinals 0-5 cover the identifier text box, which OOXML stores twice as
 * mc:Choice + mc:Fallback; it renders once, so both copies must match.
 */
const ORDERED_FILLS = [
  { expect: "XX", token: "{{DOB}}" },
  { expect: "Or", token: "{{DELETE_PARA}}" },
  { expect: "XX", token: "{{CASE_ID}}" },
  { expect: "XX", token: "{{DOB}}" },
  { expect: "Or", token: "{{DELETE_PARA}}" },
  { expect: "XX", token: "{{CASE_ID}}" },
  { expect: "XXMonth Day, YYYYXX", token: "{{LETTER_DATE}}" },
  { expect: "XX", token: null }, // opening delimiter of the position placeholder
  { expect: "positionXX", token: "{{POSITION}}" },
  { expect: "Nevada Test Site", token: "{{FACILITY}}" },
  { expect: "XXworkDatesXX", token: "{{WORK_DATES}}" },
  { expect: "XX", token: "{{PROFUSION}}" },
  { expect: "XXimpression", token: "{{IMPRESSION}}" },
  { expect: "XX", token: null }, // closing delimiter of the impression placeholder
];

const zip = new PizZip(readFileSync(SRC));
let xml = zip.file("word/document.xml").asText();

const runText = (run) =>
  [...run.matchAll(/<w:t[^>]*>(.*?)<\/w:t>/gs)].map((m) => m[1]).join("");

/** Replace a run's text, collapsing multiple <w:t> into the first and blanking the rest. */
function setRunText(run, text) {
  let first = true;
  return run.replace(/(<w:t[^>]*>)(.*?)(<\/w:t>)/gs, (_, open, __, close) => {
    if (!first) return `${open}${close}`;
    first = false;
    const tag = open.includes("xml:space") ? open : open.replace(/>$/, ' xml:space="preserve">');
    return `${tag}${text}${close}`;
  });
}

// --- Pass 1: content controls -------------------------------------------------
// Unwrap <w:sdt> to its bare runs, substituting the token for the cached placeholder
// text. Done before anything else so later passes see a flat run sequence.
let sdtCount = 0;
const unknownAliases = new Set();

xml = xml.replace(/<w:sdt>(.*?)<\/w:sdt>/gs, (block) => {
  sdtCount++;
  const alias = /<w:alias w:val="(.*?)"/.exec(block)?.[1] ?? "";
  const content = /<w:sdtContent>(.*?)<\/w:sdtContent>/s.exec(block)?.[1] ?? "";
  const replacement = SDT_ALIAS[alias];
  if (replacement === undefined) {
    unknownAliases.add(alias);
    return content;
  }
  let done = false;
  return content.replace(/<w:r\b(?:(?!<\/w:r>).)*?<\/w:r>/gs, (run) => {
    if (done || !runText(run)) return run;
    done = true;
    return setRunText(run, replacement);
  });
});

if (unknownAliases.size) {
  throw new Error(`Unmapped content-control alias(es): ${[...unknownAliases].join(", ")}`);
}
if (sdtCount !== 33) {
  throw new Error(`Expected 33 content controls, found ${sdtCount}`);
}

// --- Pass 2: ordered manual-fill runs ----------------------------------------
// Only runs still carrying a highlight are candidates; pass 1 left the unwrapped
// content-control runs highlighted too, but those no longer contain "XX"-style text.
let idx = 0;
const mismatches = [];

xml = xml.replace(/<w:r\b(?:(?!<\/w:r>).)*?<\/w:r>/gs, (run) => {
  if (!run.includes("w:highlight")) return run;
  const text = runText(run);
  if (!text || text.startsWith("{{") || text === "’s") return run;

  const fill = ORDERED_FILLS[idx];
  if (!fill) {
    mismatches.push(`extra highlighted run #${idx}: ${JSON.stringify(text)}`);
    idx++;
    return run;
  }
  if (text !== fill.expect) {
    mismatches.push(`#${idx}: expected ${JSON.stringify(fill.expect)}, got ${JSON.stringify(text)}`);
  }
  idx++;
  return fill.token === null ? "" : setRunText(run, fill.token);
});

if (mismatches.length) {
  throw new Error(`Template drift detected:\n  ${mismatches.join("\n  ")}`);
}
if (idx !== ORDERED_FILLS.length) {
  throw new Error(`Expected ${ORDERED_FILLS.length} manual-fill runs, found ${idx}`);
}

// --- Pass 3: the indefinite article ------------------------------------------
// The template hardcodes "employed as a", which reads wrong for "an electrician".
xml = xml.replace(/employed as a(\s|<)/, "employed as {{ARTICLE}}$1");
if (!xml.includes("{{ARTICLE}}")) {
  throw new Error('Could not locate the "employed as a" article');
}

// --- Pass 4: conditional identifier lines ------------------------------------
// DOL identifies a claimant by case ID when one exists, by name + DOB otherwise.
// Mark the two paragraphs so the runtime can drop whichever is unused.
function markParagraph(source, containing, marker) {
  let hits = 0;
  const out = source.replace(/<w:p\b(?:(?!<\/w:p>).)*?<\/w:p>/gs, (para) => {
    if (!para.includes(containing)) return para;
    hits++;
    return para.replace(/(<w:r\b)/, `<w:r><w:t xml:space="preserve">${marker}</w:t></w:r>$1`);
  });
  // Two hits expected: the mc:Choice and mc:Fallback copies of the text box.
  if (hits !== 2) throw new Error(`Expected 2 paragraphs containing ${containing}, found ${hits}`);
  return out;
}

xml = markParagraph(xml, "{{DOB}}", "{{IF:DOB}}");
xml = markParagraph(xml, "{{CASE_ID}}", "{{IF:CASE_ID}}");

// The red "Or" was a note to the drafter. Drop its paragraph outright — blanking only
// the run would leave an empty line between the two identifier lines.
{
  let dropped = 0;
  xml = xml.replace(/<w:p\b(?:(?!<\/w:p>).)*?<\/w:p>/gs, (para) => {
    if (!para.includes("{{DELETE_PARA}}")) return para;
    dropped++;
    return "";
  });
  if (dropped !== 2) throw new Error(`Expected to drop 2 "Or" paragraphs, dropped ${dropped}`);
}

// --- Pass 5: strip highlights and stale property values ----------------------
xml = xml.replace(/<w:highlight w:val="[^"]*"\s*\/>/g, "");
zip.file("word/document.xml", xml);

// Clear the document properties the content controls were bound to, so the file
// carries no leftover "LastName"/"Mr./Ms." metadata.
let core = zip.file("docProps/core.xml").asText();
for (const tag of ["cp:keywords", "dc:description", "cp:category", "cp:contentStatus"]) {
  core = core.replace(new RegExp(`<${tag}>.*?</${tag}>`, "s"), `<${tag}></${tag}>`);
}
zip.file("docProps/core.xml", core);

let app = zip.file("docProps/app.xml").asText();
app = app.replace(/<Company>.*?<\/Company>/s, "<Company></Company>");
zip.file("docProps/app.xml", app);

writeFileSync(OUT, zip.generate({ type: "nodebuffer", compression: "DEFLATE" }));

const tokens = [...new Set([...xml.matchAll(/\{\{[^}]+\}\}/g)].map((m) => m[0]))].sort();
console.log(`unwrapped ${sdtCount} content controls, mapped ${idx} manual-fill runs`);
console.log(`tokens: ${tokens.join(" ")}`);
console.log(`wrote ${OUT}`);
