/**
 * Drafts the causation letters SWNA sends to a physician for signature.
 *
 * The letter is drawn directly as a PDF rather than filled into a Word document. It used to
 * be a .docx, which forced three things to stay manual: the date had to be retyped (and went
 * stale — letters have gone out carrying a date over a year old), the physician's signature
 * had to be pasted in after converting to PDF, and the B-read had to be appended by hand.
 * None of those are possible in a .docx, and no docx-to-PDF conversion is available on the
 * platform this runs on. Emitting the PDF directly removes all three.
 *
 * Only the letterhead is inherited from the original document, as a one-page PDF extracted
 * from a letter that actually went out (see scripts/build-letterhead.mjs). Everything below
 * it is laid out here, over that page, and onto continuation pages as the content needs
 * them. Geometry constants are measured off that same reference letter.
 *
 * Which letter is drafted comes from the (condition, doctor) pair the form resolved to a
 * template. Each condition supplies its own prose and field set below.
 */

import { readFile } from 'fs/promises';
import path from 'path';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';

import { getLetterTemplate, LetterTemplate } from './letter-templates';
import { GeneratorResult } from './types';
import { dateOnlyParts, formatDateMMDDYY } from './utils/formatters';
import { isolateInk } from './utils/signature';
import { Paragraph, TextFlow } from './utils/text-flow';

/** How the employment dates in the letter were established. */
export type EmploymentBasis = 'recalled' | 'doe_verified';

/**
 * One stretch of employment. For `recalled` these are 4-digit years; for `doe_verified`
 * they are YYYY-MM-DD, because DOE returns exact dates and the letter should show them.
 */
export interface WorkDateRange {
  from: string;
  to: string;
}

/** Fields every letter needs, whatever the condition. */
export interface DoctorLetterCommonFields {
  first_mi: string;
  last_name: string;
  sex: 'male' | 'female';
  /** YYYY-MM-DD. Used only when no case ID is known. */
  dob?: string;
  case_id?: string;
  position: string;
  facility: string;
  facility_abbr: string;
  employment_basis: EmploymentBasis;
  work_date_ranges: WorkDateRange[];
}

/** Chronic silicosis adds the B-read findings. */
export interface ChronicSilicosisFields extends DoctorLetterCommonFields {
  /** YYYY-MM-DD — the date of the B-read, which is also the date of diagnosis. */
  dx_date: string;
  profusion: string;
  impression: string;
}

export type DoctorLetterFormData = ChronicSilicosisFields;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// --- Page geometry, measured off the reference letter -------------------------------
// (rendered at 1400px and scanned for content bands; see scripts/build-letterhead.mjs)

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
/** Word's 1152-twip left/right margins. */
const MARGIN_X = 57.6;
const TEXT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
/** Baseline of the date line, the first thing below the letterhead. */
const FIRST_BASELINE = 601;
/** Continuation pages carry no letterhead, so the body starts near the top margin. */
const CONTINUATION_BASELINE = 730;
/** Word single spacing for 12pt Times New Roman. */
const LINE_HEIGHT = 13.8;
const BODY_SIZE = 12;
/** The attestation and the footnote are both set two points down. */
const SMALL_SIZE = 10;
const SMALL_LINE_HEIGHT = 11.5;
/** Lowest baseline the body may occupy, matching Word's 1008-twip bottom margin. */
const BODY_BOTTOM = 60;
/** The claimant identifier block sits to the right of the date. */
const IDENTIFIER_X = 330;
/** The signature is indented from the margin and drawn at its measured size. */
const SIGNATURE_X = MARGIN_X + 15.4;
const SIGNATURE_WIDTH = 126;
const SIGNATURE_HEIGHT = 49;
/** "Respectfully," baseline down to the bottom edge of the signature image. */
const SIGNATURE_BOTTOM_DROP = 52.5;
/** "Respectfully," baseline down to the first line of the printed name block. */
const SIGNATURE_BLOCK_DROP = 71.7;

/** The footnote lives in the bottom margin, below the body, as Word places it. */
const FOOTNOTE_RULE_Y = 67.3;
const FOOTNOTE_RULE_WIDTH = 143;
const FOOTNOTE_BASELINE = 52.3;

const SIGNATURE_FILE = 'toupin_signature.jpg';

/**
 * A date input gives "YYYY-MM-DD", which Date reads as midnight UTC. Formatting that
 * with local accessors lands on the previous day west of Greenwich, so both helpers go
 * through dateOnlyParts, which reads in UTC.
 */
function formatSlashed(value: string): string {
  const parts = dateOnlyParts(value);
  if (!parts) throw new Error(`Unparseable date: ${value}`);
  return `${parts.month}/${parts.day}/${parts.year}`;
}

function formatLongDate(value: string): string {
  const parts = dateOnlyParts(value);
  if (!parts) throw new Error(`Unparseable date: ${value}`);
  return `${MONTHS[Number(parts.month) - 1]} ${Number(parts.day)}, ${parts.year}`;
}

/** Today as YYYY-MM-DD, read in local time so the date matches the drafter's calendar. */
function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** "an" before a vowel sound, "a" otherwise. */
export function indefiniteArticle(noun: string): string {
  return /^[aeiou]/i.test(noun.trim()) ? 'an' : 'a';
}

/**
 * Employment is rarely one unbroken stretch, so the ranges are joined as an English list:
 * "1982 to 1986, 1993 to 1994, and 2005 to 2006".
 */
function formatWorkDates(
  ranges: WorkDateRange[],
  basis: EmploymentBasis
): string {
  const format = (value: string) =>
    basis === 'doe_verified' ? formatSlashed(value) : value.trim();
  const parts = ranges.map((r) => `${format(r.from)} to ${format(r.to)}`);

  if (parts.length === 0) throw new Error('At least one work date range is required');
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

/**
 * The sentence establishing where the employment dates came from.
 *
 * DOE-verified dates carry more weight than a patient's recollection, and the letter has to
 * say which it is — asserting recall for verified dates understates the evidence, and the
 * reverse overstates it.
 */
function employmentBasisSentence(
  basis: EmploymentBasis,
  workDates: string
): string {
  return basis === 'doe_verified'
    ? `Described employment is DOE verified to have occurred from ${workDates}.`
    : `Described employment is recalled by the patient to have occurred from approximately ${workDates}.`;
}

const FOOTNOTE_CITATION =
  'Leung CC, Yu IT, Chen W. "Silicosis." Lancet. 2012;379(9830):2008-2018. doi:10.1016/S0140-6736(12)60235-9';

const ATTESTATION =
  'Complying with the procedures and guidelines of the DEEOIC program, I affirm that my ' +
  'professional medical opinion, pertaining to the issues examined in this case, is entirely ' +
  'independent of any financial considerations that might benefit me, my medical practice, or ' +
  'any third-party, and I hereby attest that I possess the requisite medical expertise ' +
  'necessary to provide a well-rationalized medical opinion regarding this case.';

const DOL_ADDRESS = [
  'U.S. Department of Labor',
  'Office of Workers’ Compensation Programs',
  'Division of Energy Employees Occupational',
  'Illness Compensation',
  'P.O. Box 8306',
  'London KY 40742-8306',
];

const SIGNATURE_BLOCK = [
  'Brian Toupin, M.D',
  'Board Certified Emergency Medicine Physician',
  'NPI: 1386958445',
];

interface Fonts {
  body: PDFFont;
}

/**
 * Isolating the ink is a sharp round-trip, and the signature never changes, so it is done
 * once per process rather than once per letter.
 */
let signatureCache: Promise<Buffer> | null = null;

function loadSignature(): Promise<Buffer> {
  if (!signatureCache) {
    signatureCache = (async () => {
      const raw = await readFile(
        path.join(process.cwd(), 'public', 'templates', SIGNATURE_FILE)
      );
      // The signature on file is a scan on solid white. Drawn as-is it would paint a white
      // box over the signature block, so the paper is made transparent first.
      const isolated = await isolateInk(raw);
      if (!isolated) {
        throw new Error(
          `Could not isolate the signature ink in ${SIGNATURE_FILE} — the image may be blank.`
        );
      }
      return isolated;
    })();
  }
  return signatureCache;
}

export class DoctorLetterGenerator {
  async generate(
    templateId: string,
    formData: DoctorLetterFormData
  ): Promise<GeneratorResult> {
    const template = getLetterTemplate(templateId);

    const letterheadBytes = await readFile(
      path.join(process.cwd(), 'public', 'templates', template.templateFile)
    );
    const pdfDoc = await PDFDocument.load(letterheadBytes);

    const fonts: Fonts = {
      body: await pdfDoc.embedFont(StandardFonts.TimesRoman),
    };

    const firstPage = pdfDoc.getPages()[0];
    const addPage = (): PDFPage =>
      pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    this.drawIdentifierBlock(firstPage, fonts, formData);

    let footnotePage: PDFPage | null = null;
    const flow = new TextFlow(firstPage, {
      x: MARGIN_X,
      width: TEXT_WIDTH,
      startY: FIRST_BASELINE,
      continuationStartY: CONTINUATION_BASELINE,
      bottom: BODY_BOTTOM,
      lineHeight: LINE_HEIGHT,
      addPage,
    });

    for (const block of this.buildBody(template, formData, fonts)) {
      flow.drawParagraph(block.paragraph);
      if (block.carriesFootnote) footnotePage = flow.currentPage;
    }

    await this.drawSignatureBlock(pdfDoc, flow, fonts);

    if (footnotePage) this.drawFootnote(footnotePage, fonts, flow);

    return {
      filename: buildFilename(template, formData),
      pdfBytes: Buffer.from(await pdfDoc.save()),
    };
  }

  /**
   * DOL identifies a claimant by case ID once one exists; the DOB line is the fallback for a
   * claim that hasn't been assigned one yet. Only one is printed.
   */
  private drawIdentifierBlock(
    page: PDFPage,
    fonts: Fonts,
    form: DoctorLetterCommonFields
  ): void {
    const lines = [`Employee: ${form.first_mi.trim()} ${form.last_name.trim()}`];
    const caseId = form.case_id?.trim();
    if (caseId) {
      lines.push(`Case ID: ${caseId}`);
    } else if (form.dob) {
      lines.push(`DOB: ${formatSlashed(form.dob)}`);
    }

    lines.forEach((line, index) => {
      page.drawText(line, {
        x: IDENTIFIER_X,
        y: FIRST_BASELINE - index * LINE_HEIGHT,
        size: BODY_SIZE,
        font: fonts.body,
        color: rgb(0, 0, 0),
      });
    });
  }

  private buildBody(
    template: LetterTemplate,
    form: DoctorLetterFormData,
    fonts: Fonts
  ): { paragraph: Paragraph; carriesFootnote?: boolean }[] {
    switch (template.conditionId) {
      case 'chronic-silicosis':
        return this.chronicSilicosisBody(form, fonts);
      default:
        throw new Error(`No prose for condition: ${template.conditionId}`);
    }
  }

  private chronicSilicosisBody(
    form: ChronicSilicosisFields,
    fonts: Fonts
  ): { paragraph: Paragraph; carriesFootnote?: boolean }[] {
    const male = form.sex === 'male';
    const title = male ? 'Mr.' : 'Ms.';
    const possessive = male ? 'his' : 'her';
    const last = form.last_name.trim();
    const firstMi = form.first_mi.trim();
    const position = form.position.trim();
    const facility = form.facility.trim();
    const abbr = form.facility_abbr.trim();
    const dxDate = formatSlashed(form.dx_date);
    const workDates = formatWorkDates(form.work_date_ranges, form.employment_basis);
    // The impression is quoted as a matter of record, so it is reproduced exactly as the
    // B-read words it — including any punctuation the radiologist used. The sentence's
    // full stop goes inside the closing quote, as the sent letters set it, and is only
    // added when the impression does not already end in one of its own.
    const impressionText = form.impression.trim();
    const impression = /[.?!]$/.test(impressionText)
      ? impressionText
      : `${impressionText}.`;

    const text = (value: string): Paragraph => ({
      runs: [{ text: value, font: fonts.body, size: BODY_SIZE }],
      spaceAfter: LINE_HEIGHT,
    });

    const heading = (value: string): Paragraph => ({
      runs: [
        { text: value, font: fonts.body, size: BODY_SIZE, underline: true },
        // The colon sits outside the underline in the original.
        { text: ':', font: fonts.body, size: BODY_SIZE },
      ],
      spaceAfter: LINE_HEIGHT,
    });

    const blocks: { paragraph: Paragraph; carriesFootnote?: boolean }[] = [];
    const push = (paragraph: Paragraph, carriesFootnote = false) =>
      blocks.push({ paragraph, carriesFootnote });

    push(text(formatLongDate(todayIso())));

    // Each address line is its own paragraph: they are fixed text that must break exactly
    // where written, not wrap to the column.
    DOL_ADDRESS.forEach((line, index) => {
      push({
        runs: [{ text: line, font: fonts.body, size: BODY_SIZE }],
        spaceAfter: index === DOL_ADDRESS.length - 1 ? LINE_HEIGHT : 0,
      });
    });

    push(text('To Whom It May Concern:'));

    push(heading('Background'));
    push(
      text(
        `I am writing in reference to ${title} ${firstMi} ${last} who has been referred to my ` +
          `practice for an assessment of medical conditions that may have arisen in conjunction ` +
          `with ${possessive} reported employment at a Department of Energy (DOE) facility. ` +
          `There is information to support that ${title} ${last} was potentially exposed to ` +
          `toxins while employed at a DOE facility. This report will assess the likelihood, ` +
          `based on the currently available information, that ${title} ${last}’s potential ` +
          `exposures are linked to ${possessive} identified illnesses.`
      )
    );

    push(heading('Employment/Exposure Information'));
    push(
      text(
        `It is reported that ${title} ${last} was employed as ${indefiniteArticle(position)} ` +
          `${position} at the ${facility} (${abbr}). ` +
          `${employmentBasisSentence(form.employment_basis, workDates)} ` +
          `The patient reports exposure to silica, i.e., silicon dioxide crystalline, while ` +
          `employed at the ${abbr}, and the ${abbr} is a DOE facility where silica is known to ` +
          `have been present. I recognize that more specific employment dates or exposure ` +
          `levels may be necessary to issue a final medical opinion. If this information is ` +
          `required, please send those documents to my office for review.`
      )
    );

    push(heading('Medical Information'));
    push({
      marker: { text: '•', font: fonts.body, size: BODY_SIZE },
      runs: [
        {
          text:
            `${dxDate} Chest Radiograph with B-Read Interpretation. ${title} ` +
            `${last}’s radiograph documented classifiable parenchymal abnormalities and ` +
            `small opacities. The profusion identified was ${form.profusion.trim()}. The ` +
            `impression states, “${impression}”`,
          font: fonts.body,
          size: BODY_SIZE,
        },
      ],
      indent: 28.8,
      hangingIndent: 46.8,
      spaceAfter: LINE_HEIGHT,
    });

    push(
      text(
        `The radiograph results display parenchymal abnormalities and a profusion consistent ` +
          `with chronic silicosis (ICD J62.8), with an initial onset and date of diagnosis on ` +
          `${dxDate}.`
      )
    );

    push(
      {
        runs: [
          {
            text:
              'Chronic silicosis is a lung disease commonly caused by occupational exposure to ' +
              'crystalline silica dust. When workers inhale silica particles, they embed in the ' +
              'lung tissue causing inflammation that leads to the accumulation of fibrous ' +
              'tissue. The disease progression may result in complications such as respiratory ' +
              'insufficiency and an increased risk of respiratory distress or failure, though ' +
              'mild cases may be asymptomatic. Radiographic findings diagnostic of chronic ' +
              'silicosis typically involves small nodular opacities, but in advanced cases ' +
              'progressive massive fibrosis (PMF) may be observed [',
            font: fonts.body,
            size: BODY_SIZE,
          },
          {
            text: '1',
            font: fonts.body,
            size: SMALL_SIZE * 0.7,
            rise: BODY_SIZE * 0.33,
          },
          { text: '].', font: fonts.body, size: BODY_SIZE },
        ],
        spaceAfter: LINE_HEIGHT,
      },
      true
    );

    push(heading('Discussion and Summary Opinion'));
    push(
      text(
        `${title} ${last} was employed at the ${abbr}, a facility where respirable silica is ` +
          `known to be present. The patient’s radiograph displays abnormalities consistent ` +
          `with chronic silicosis, which I find to be an appropriate diagnosis in the setting of ` +
          `prior silica exposure. Therefore, it is my medical opinion that ${title} ` +
          `${last}’s exposure to respirable silica was at least as likely as not a ` +
          `significant factor in contributing to ${possessive} chronic silicosis, and that ` +
          `${possessive} exposure to silica was at least as likely as not a result of ` +
          `employment at the ${abbr}.`
      )
    );

    push(
      text(
        'If you have any further questions or require clarifications, please direct your ' +
          'inquiries to my office. I will be able to provide you with the necessary and updated ' +
          'information.'
      )
    );

    return blocks;
  }

  /** "Respectfully," the signature image, the name block, then the attestation. */
  private async drawSignatureBlock(
    pdfDoc: PDFDocument,
    flow: TextFlow,
    fonts: Fonts
  ): Promise<void> {
    const attestationLines = Math.ceil(ATTESTATION.length / 105);
    const blockHeight =
      SIGNATURE_BLOCK_DROP +
      SIGNATURE_BLOCK.length * LINE_HEIGHT +
      LINE_HEIGHT +
      attestationLines * SMALL_LINE_HEIGHT;
    // Splitting a signature across a page break would leave a letter that reads as unsigned.
    flow.reserve(blockHeight);

    const respectfully = flow.currentY;
    flow.drawParagraph({
      runs: [{ text: 'Respectfully,', font: fonts.body, size: BODY_SIZE }],
    });

    const signatureImage = await pdfDoc.embedPng(await loadSignature());
    flow.currentPage.drawImage(signatureImage, {
      x: SIGNATURE_X,
      y: respectfully - SIGNATURE_BOTTOM_DROP,
      width: SIGNATURE_WIDTH,
      height: SIGNATURE_HEIGHT,
    });

    // Skip past the signature to where the printed name block starts.
    flow.moveTo(respectfully - SIGNATURE_BLOCK_DROP);

    for (const line of SIGNATURE_BLOCK) {
      flow.drawParagraph({
        runs: [{ text: line, font: fonts.body, size: BODY_SIZE }],
      });
    }

    flow.advance(LINE_HEIGHT);
    flow.drawParagraph({
      runs: [{ text: ATTESTATION, font: fonts.body, size: SMALL_SIZE }],
      lineHeight: SMALL_LINE_HEIGHT,
    });
  }

  /**
   * The citation supporting the radiographic-findings sentence, printed at the foot of
   * whichever page carries its marker, under a short rule in the Word convention.
   */
  private drawFootnote(page: PDFPage, fonts: Fonts, flow: TextFlow): void {
    // The footnote occupies the bottom margin, so it only collides if the body ran all the
    // way down to it. Fail loudly rather than print the citation over the last paragraph.
    const lowest = flow.lowestBaselineOn(page);
    if (lowest !== null && lowest < FOOTNOTE_RULE_Y + LINE_HEIGHT) {
      throw new Error(
        'The letter body reaches the footnote area. Shorten the impression or the ' +
          'employment details, or the citation will overlap the text.'
      );
    }

    page.drawLine({
      start: { x: MARGIN_X, y: FOOTNOTE_RULE_Y },
      end: { x: MARGIN_X + FOOTNOTE_RULE_WIDTH, y: FOOTNOTE_RULE_Y },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });

    const markerSize = SMALL_SIZE * 0.7;

    page.drawText('1', {
      x: MARGIN_X,
      y: FOOTNOTE_BASELINE + SMALL_SIZE * 0.33,
      size: markerSize,
      font: fonts.body,
      color: rgb(0, 0, 0),
    });

    page.drawText(FOOTNOTE_CITATION, {
      x: MARGIN_X + fonts.body.widthOfTextAtSize('1', markerSize) + 2,
      y: FOOTNOTE_BASELINE,
      size: SMALL_SIZE,
      font: fonts.body,
      color: rgb(0, 0, 0),
    });
  }
}

function buildFilename(
  template: LetterTemplate,
  form: DoctorLetterCommonFields
): string {
  const name = `${form.first_mi} ${form.last_name}`
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_.-]/g, '');
  return `${template.filenamePrefix}_${name}_${formatDateMMDDYY()}.pdf`;
}
