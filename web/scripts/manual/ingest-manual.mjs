// Turn the EEOICPA Procedure Manual PDF into citeable, verbatim units for the
// Procedure Manual tool. Re-run whenever DOL publishes a new version:
//
//   node web/scripts/manual/ingest-manual.mjs "/path/to/EEOIC Procedure Manual X.X.pdf"
//   node web/scripts/manual/embed-manual.mjs
//
// Needs poppler's `pdftotext` (brew install poppler). Writes
// web/src/data/manual/units.json (chapter paragraphs + exhibits) and toc.json.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [, , pdfFile] = process.argv;
if (!pdfFile) {
  console.error('usage: node ingest-manual.mjs <manual.pdf>');
  process.exit(1);
}
const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/data/manual');
// -layout keeps indentation, which is how paragraph levels are told apart.
const raw = execFileSync('pdftotext', ['-layout', pdfFile, '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const [, version, published] =
  raw.match(/Version (\d+\.\d+)\s+Published: ([A-Za-z]+ \d+, \d{4})/) || [];

// --- 1. pages: strip running header/footer, remember printed page number -----
const FOOTER = /^Version \d+\.\d+\s{2,}(.*)$/;
const HEADER = /^Federal \(EEOICPA\) Procedure Manual\s{2,}/;

const pages = raw.split('\f').map((pageText) => {
  const page = { printed: null, exhibit: null, lines: [] };
  let afterHeader = false;
  for (const line of pageText.split('\n')) {
    // Long chapter titles wrap the running header onto a second,
    // right-aligned line ("Substance Exposure and Causation").
    if (afterHeader && /^\s{20,}\S/.test(line)) {
      afterHeader = false;
      continue;
    }
    afterHeader = false;
    const f = line.match(FOOTER);
    if (f) {
      const cols = f[1].trim().split(/\s{2,}/);
      const ex = f[1].match(/Exhibit\s+(\d+-\d+)/);
      if (ex) page.exhibit = ex[1];
      else if (cols.length >= 1 && /^[0-9ivx]+$/i.test(cols[0])) page.printed = cols[0];
      continue;
    }
    if (HEADER.test(line)) {
      afterHeader = true;
      continue;
    }
    page.lines.push(line);
  }
  return page;
});

// --- 2. chapter body ---------------------------------------------------------
const ROMAN = /^(i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|xiv|xv)$/;
// Labels: "4.", "c.", "ccc." (definitions run past z), "(1)", "(a)", "(xiv)".
// Usually followed by 2+ spaces; a single space is accepted only before a
// capital, which rules out wrapped text like "etc. The CCC".
const LABEL = /^(\s*)(\d{1,2}\.|([a-z])\3{0,2}\.|\(\d{1,2}\)|\([a-z]{1,4}\))(?:\s{2,}|\s(?=[A-Z“"]))(.*)$/;
const CHAPTER = /^\s*CHAPTER (\d+)\s*[–-]\s*(.+?)\s*$/;

const chapters = [];
const units = [];
let chapter = null;
let stack = []; // [{level, label, heading}]
let cur = null;
let inBody = false;

function joinLines(ls) {
  // Blank lines separate paragraphs; wrapped lines join with a space. Word
  // PDFs don't auto-hyphenate, so a line-final "-" is a real hyphen
  // ("case-related") and joins without a space.
  // A blank line inside a sentence ("…the email, the" / "claimant's last
  // name…") is a page break, not a new paragraph.
  const paras = [];
  let buf = '';
  let gap = false;
  for (const l of ls) {
    const t = l.trim();
    if (!t) {
      gap = !!buf;
      continue;
    }
    if (gap && !/[.:;!?)”"]$/.test(buf) && /^[a-z(]/.test(t)) gap = false;
    if (gap) paras.push(buf), (buf = '');
    gap = false;
    buf = !buf ? t : /[-–/]$/.test(buf) ? buf + t : buf + ' ' + t;
  }
  if (buf) paras.push(buf);
  return paras.map((p) => p.replace(/\s{2,}/g, ' ')).join('\n\n').trim();
}

// "Impairment Ratings by a CMC." is a heading; "Generally, the CE sends:" is not.
function splitHeading(text) {
  const m = text.match(/^([A-Z(](?:(?:[A-Z]\.){2,}|[^.:\n]){0,140}?)[.:](?:\s+|$)([\s\S]*)$/);
  if (!m) return [null, text];
  const words = m[1].split(/\s+/).filter((w) => /^[A-Za-z]{4,}/.test(w));
  const caps = words.filter((w) => /^[A-Z]/.test(w)).length;
  if (words.length && caps / words.length < 0.6) return [null, text];
  return [m[1].trim(), m[2].trim()];
}

function flush() {
  if (!cur) return;
  const top = stack[stack.length - 1];
  const joined = joinLines(cur.lines);
  // Chapter 1 definitions ("Covered Illness means, ...") are one sentence: the
  // term is the heading, but the text stays whole so quotes are complete.
  const def = chapter.num === 1 && stack.length === 2 && joined.match(/^([A-Z][^.,;:]{1,80}?) (?:means|is|are|refers to)\b/);
  const [heading, body] = def ? [def[1], joined] : splitHeading(joined);
  top.heading = heading;
  if (top.level === 1) chapter.sections.push({ num: Number(top.label.slice(0, -1)), title: heading });
  units.push({
    id: cur.id,
    kind: 'paragraph',
    chapter: chapter.num,
    chapterTitle: chapter.title,
    section: `${chapter.num}.${stack[0].label.slice(0, -1)}`,
    sectionTitle: stack[0].heading,
    path: stack.map((s) => s.heading).filter(Boolean),
    page: cur.page,
    heading,
    text: body,
  });
  cur = null;
}

function levelOf(label) {
  if (/^\d+\.$/.test(label)) return 1;
  if (/^[a-z]+\.$/.test(label)) return 2;
  if (/^\(\d+\)$/.test(label)) return 3;
  // "(i)" is roman unless it follows "(h)"; other roman-looking labels are
  // roman only when we're already in a roman list ("(v)" after "(u)" is a letter).
  const inner = label.slice(1, -1);
  const top = stack[stack.length - 1];
  if (ROMAN.test(inner)) {
    if (top?.level === 5) return 5;
    if (inner === 'i' && !(top?.level === 4 && top.label === '(h)')) return 5;
  }
  return 4;
}

const cite = () =>
  `${chapter.num}.${stack[0].label.slice(0, -1)}` + stack.slice(1).map((s) => s.label.replace('.', '')).join('');

for (const page of pages) {
  for (const line of page.lines) {
    if (/^\s*EXHIBITS\s*$/.test(line) && inBody) {
      flush();
      inBody = false;
      break;
    }
    const ch = line.match(CHAPTER);
    if (ch) {
      flush();
      inBody = true;
      chapter = { num: Number(ch[1]), title: titleCase(ch[2]), sections: [] };
      chapters.push(chapter);
      stack = [];
      continue;
    }
    if (!inBody || !chapter) continue;

    const m = line.match(LABEL);
    if (m && !(/^\d/.test(m[2]) && m[1].length > 3)) {
      flush();
      const lvl = levelOf(m[2]);
      stack = stack.filter((s) => s.level < lvl);
      stack.push({ level: lvl, label: m[2], heading: null });
      if (stack[0].level !== 1) {
        // label before any numbered section (rare) — attach to previous section
        stack = [];
        continue;
      }
      cur = { id: cite(), page: page.printed, lines: [m[4]] };
      continue;
    }
    if (cur) cur.lines.push(line);
  }
}
flush();

// --- 3. exhibits: group appendix pages by the "Exhibit N-N" footer ----------
const exhibitTitles = new Map();
for (const m of raw.matchAll(/^Exhibit (\d+-\d+)\s{2,}(.+?)\s*$/gm)) {
  if (!exhibitTitles.has(m[1])) exhibitTitles.set(m[1], m[2]);
}
const exhibitPages = new Map();
for (const p of pages) {
  if (!p.exhibit) continue;
  if (!exhibitPages.has(p.exhibit)) exhibitPages.set(p.exhibit, []);
  exhibitPages.get(p.exhibit).push(p.lines.join('\n'));
}
for (const [num, texts] of exhibitPages) {
  const chapterNum = Number(num.split('-')[0]);
  units.push({
    id: `Exhibit ${num}`,
    kind: 'exhibit',
    chapter: chapterNum,
    chapterTitle: chapters.find((c) => c.num === chapterNum)?.title ?? null,
    section: `Exhibit ${num}`,
    sectionTitle: exhibitTitles.get(num) ?? null,
    path: [exhibitTitles.get(num)].filter(Boolean),
    page: null,
    heading: exhibitTitles.get(num) ?? null,
    // Exhibits are forms/letters: keep the layout, only trim blank runs.
    text: texts.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
  });
}

// The PM repeats a few labels (numbering slips in the source). Keep the
// printed cite but give repeats a unique id so lookups stay stable.
const seen = new Map();
for (const u of units) {
  u.cite = u.id;
  const n = (seen.get(u.id) || 0) + 1;
  seen.set(u.id, n);
  if (n > 1) u.id = `${u.id}~${n}`;
}

function titleCase(s) {
  const small = new Set(['and', 'of', 'for', 'the', 'to', 'in', 'on', 'a', 'or']);
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) =>
      /^(eeoicpa|fab|swc|deeoic|rd|sec)$/.test(w) ? w.toUpperCase()
      : i && small.has(w) ? w
      : w[0].toUpperCase() + w.slice(1),
    )
    .join(' ');
}

fs.mkdirSync(outDir, { recursive: true });
const meta = { title: 'Federal (EEOICPA) Procedure Manual', version, published, unitCount: units.length };
fs.writeFileSync(path.join(outDir, 'units.json'), JSON.stringify({ meta, units }));
fs.writeFileSync(path.join(outDir, 'toc.json'), JSON.stringify({ meta, chapters }, null, 1));
console.log(meta, 'chapters', chapters.length, 'exhibits', exhibitPages.size);
