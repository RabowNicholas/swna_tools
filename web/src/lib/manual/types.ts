// Shapes of the generated files in src/data/manual (see scripts/manual/).

export interface ManualMeta {
  title: string;
  version: string;
  published: string;
  unitCount: number;
}

/** One citeable piece of the manual: a labeled paragraph or a whole exhibit. */
export interface ManualUnit {
  /** Unique id; equals `cite` except for the few labels the PM repeats ("16.12d(1)~2"). */
  id: string;
  /** The cite as printed in the manual, e.g. "21.4c(1)" or "Exhibit 21-1". */
  cite: string;
  kind: 'paragraph' | 'exhibit';
  chapter: number;
  chapterTitle: string | null;
  /** "21.4" for paragraphs, "Exhibit 21-1" for exhibits. */
  section: string;
  sectionTitle: string | null;
  /** Headings from the section down to this paragraph. */
  path: string[];
  /** Printed page number (paragraphs only). */
  page: string | null;
  heading: string | null;
  /** Verbatim text. Paragraphs are separated by blank lines; exhibits keep their layout. */
  text: string;
}

export interface ManualData {
  meta: ManualMeta;
  units: ManualUnit[];
}

export interface ManualEmbeddings {
  model: string;
  version: string;
  dim: number;
  /** Unit id for each row; long units span several rows. */
  ids: string[];
  /** Base64 int8 matrix, ids.length × dim. */
  vectors: string;
}

export interface AskResponse {
  /** null when the AI step is unavailable; `sources` still holds the search results. */
  answer: string | null;
  sources: ManualUnit[];
  /** Why there's no answer (rate limit, missing key, …). */
  unavailableReason?: string;
}
