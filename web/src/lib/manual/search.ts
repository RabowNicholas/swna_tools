import MiniSearch from 'minisearch';
import type { ManualData, ManualEmbeddings, ManualUnit } from './types';

// Hybrid search over the manual: BM25 keywords (MiniSearch) plus semantic
// similarity (bge-small embeddings), merged with reciprocal-rank fusion.
// Runs anywhere. Without a query vector it's keyword-only, which is what the
// server (and any agent calling askManual) uses.

const RRF_K = 60;
const CANDIDATES = 50;

export interface ManualIndex {
  meta: ManualData['meta'];
  byId: Map<string, ManualUnit>;
  search(query: string, opts?: { k?: number; queryVector?: Float32Array | number[] }): ManualUnit[];
  /**
   * Add each unit's direct sub-paragraphs after it. A match on a heading like
   * 24.7a(6) "Notice of Recommended Decision" is only useful with 24.7a(6)(a),
   * which holds the actual 60-day rule.
   */
  withChildren(units: ManualUnit[], opts?: { maxUnits?: number; maxChars?: number }): ManualUnit[];
}

/** "21.4c(1)" → "21.4c", "21.4c" → "21.4", "21.4" → null. */
export function parentCite(cite: string): string | null {
  if (/\)$/.test(cite)) return cite.replace(/\([a-z0-9]+\)$/, '');
  if (/^\d+\.\d+[a-z]+$/.test(cite)) return cite.replace(/[a-z]+$/, '');
  return null;
}

export function buildIndex(data: ManualData, embeddings?: ManualEmbeddings): ManualIndex {
  const byId = new Map(data.units.map((u) => [u.id, u]));
  const byCite = new Map<string, ManualUnit>();
  for (const u of data.units) if (!byCite.has(u.cite.toLowerCase())) byCite.set(u.cite.toLowerCase(), u);

  const mini = new MiniSearch<ManualUnit & { pathText: string }>({
    fields: ['cite', 'heading', 'pathText', 'text'],
    storeFields: [],
    searchOptions: { boost: { cite: 4, heading: 3, pathText: 1.5 }, fuzzy: 0.15, prefix: true, combineWith: 'OR' },
  });
  mini.addAll(data.units.map((u) => ({ ...u, pathText: [u.chapterTitle, ...u.path].join(' ') })));

  const children = new Map<string, ManualUnit[]>();
  for (const u of data.units) {
    const parent = u.kind === 'paragraph' ? parentCite(u.cite) : null;
    if (!parent) continue;
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent)!.push(u);
  }

  const vectors = embeddings ? decodeVectors(embeddings.vectors) : null;

  function semantic(qv: Float32Array | number[]): string[] {
    if (!embeddings || !vectors) return [];
    const { dim, ids } = embeddings;
    const best = new Map<string, number>(); // unit id -> best window score
    for (let r = 0; r < ids.length; r++) {
      let s = 0;
      const off = r * dim;
      for (let c = 0; c < dim; c++) s += qv[c] * vectors[off + c];
      const prev = best.get(ids[r]);
      if (prev === undefined || prev < s) best.set(ids[r], s);
    }
    return [...best.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, CANDIDATES)
      .map(([id]) => id);
  }

  function search(query: string, { k = 8, queryVector }: { k?: number; queryVector?: Float32Array | number[] } = {}) {
    const q = query.trim();
    if (!q) return [];

    // A bare cite ("21.4c(1)", "exhibit 21-1") jumps straight to that unit.
    const direct = byCite.get(q.toLowerCase());
    if (direct) return [direct];

    const score = new Map<string, number>();
    const add = (ids: string[]) => ids.forEach((id, i) => score.set(id, (score.get(id) ?? 0) + 1 / (RRF_K + i)));
    add(mini.search(q).slice(0, CANDIDATES).map((r) => r.id as string));
    if (queryVector) add(semantic(queryVector));

    // Exhibits are long sample letters/forms and match almost anything; rank
    // them lower unless the user is clearly looking for one.
    if (!/\b(letter|exhibit|form|sample|template|worksheet)s?\b/i.test(q)) {
      for (const [id, s] of score) if (byId.get(id)?.kind === 'exhibit') score.set(id, s * 0.6);
    }

    return [...score.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, k)
      .map(([id]) => byId.get(id)!)
      .filter(Boolean);
  }

  function withChildren(units: ManualUnit[], { maxUnits = 14, maxChars = 24_000 } = {}) {
    // The given units always stay; sub-paragraphs fill the remaining budget,
    // placed right after their parent.
    const seen = new Set(units.map((u) => u.id));
    let room = maxUnits - units.length;
    let chars = maxChars - units.reduce((n, u) => n + u.text.length, 0);
    const out: ManualUnit[] = [];
    for (const u of units) {
      out.push(u);
      for (const child of (children.get(u.cite) ?? []).slice(0, 4)) {
        if (room <= 0 || seen.has(child.id) || child.text.length > chars) continue;
        seen.add(child.id);
        out.push(child);
        room--;
        chars -= child.text.length;
      }
    }
    return out;
  }

  return { meta: data.meta, byId, search, withChildren };
}

function decodeVectors(b64: string): Int8Array {
  const bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const out = new Int8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = (bin.charCodeAt(i) << 24) >> 24;
  return out;
}
