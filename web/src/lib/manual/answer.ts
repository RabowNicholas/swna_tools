import manualData from '@/data/manual/units.json';
import { buildIndex, type ManualIndex } from './search';
import { enforceVerbatimQuotes } from './quotes';
import type { AskResponse, ManualData, ManualUnit } from './types';

// Answers a procedure question from the manual using a free-tier Gemini model.
// Callable from the API route or directly by an agent. If the model is
// unavailable (no key, rate limit, outage) it still returns the sources.

const MAX_SOURCES = 8;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

let index: ManualIndex | null = null;
function getIndex() {
  index ??= buildIndex(manualData as ManualData);
  return index;
}

const SYSTEM_PROMPT = `You answer questions for staff at a firm that helps claimants under the Energy Employees Occupational Illness Compensation Program Act (EEOICPA). Your only source is excerpts from the DOL Federal (EEOICPA) Procedure Manual, given below with their cites.

Rules:
- Use only the excerpts. Do not use outside knowledge of EEOICPA, regulations, or case law.
- After every sentence that states something from the manual, add its cite in square brackets exactly as given, e.g. [21.4c(1)] or [Exhibit 21-1]. Use only cites from the excerpts.
- If the excerpts don't answer the question, say "The sections I found don't answer this." and name the closest relevant cites. Never guess.
- Put text in quotation marks only when copying it word-for-word from an excerpt.
- Answer the general procedure question. Don't analyze a specific claimant's case or predict outcomes.
- Be concise and plain-spoken. Lead with the direct answer, then the supporting detail. Use short "- " bullet lists for steps or criteria. You may use **bold** sparingly. No headings.`;

function formatSources(units: ManualUnit[]): string {
  return units
    .map((u) => {
      const where = [u.chapterTitle && `Chapter ${u.chapter} – ${u.chapterTitle}`, ...u.path].filter(Boolean).join(' > ');
      return `[${u.cite}] (${where})\n${u.text.slice(0, 6000)}`;
    })
    .join('\n\n---\n\n');
}

/**
 * @param sourceIds unit ids already chosen by the caller (the page sends its
 *   browser-side hybrid search results). Omit to search server-side by keyword.
 */
export async function askManual(question: string, sourceIds?: string[]): Promise<AskResponse> {
  const idx = getIndex();
  const fromIds = (sourceIds ?? []).map((id) => idx.byId.get(id)).filter((u): u is ManualUnit => !!u);
  const sources = idx.withChildren((fromIds.length ? fromIds : idx.search(question, { k: MAX_SOURCES })).slice(0, MAX_SOURCES));

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { answer: null, sources, unavailableReason: 'AI answers aren’t set up yet (no GEMINI_API_KEY).' };
  if (!sources.length) return { answer: null, sources, unavailableReason: 'No matching sections found.' };

  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: 'user',
            parts: [{ text: `Excerpts from the Procedure Manual:\n\n${formatSources(sources)}\n\n===\n\nQuestion: ${question}` }],
          },
        ],
        generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
      }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch (err) {
    console.error('Gemini request failed:', err);
    return { answer: null, sources, unavailableReason: 'The AI service didn’t respond.' };
  }

  if (!res.ok) {
    console.error('Gemini error', res.status, (await res.text()).slice(0, 500));
    const reason =
      res.status === 429 ? 'The free AI limit has been reached for now.' : `The AI service returned an error (${res.status}).`;
    return { answer: null, sources, unavailableReason: reason };
  }

  const body = await res.json();
  const text: string | undefined = body?.candidates?.[0]?.content?.parts
    ?.filter((p: { thought?: boolean }) => !p.thought)
    .map((p: { text?: string }) => p.text ?? '')
    .join('')
    .trim();
  if (!text) return { answer: null, sources, unavailableReason: 'The AI returned an empty answer.' };

  return { answer: enforceVerbatimQuotes(text, sources), sources };
}
