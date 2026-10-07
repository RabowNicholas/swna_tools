// Embed manual units for semantic search. Runs locally and free; run after
// ingest-manual.mjs:  node web/scripts/manual/embed-manual.mjs
// Long units are split into ~200-word windows; each window keeps its unit id.
// The browser embeds questions with the same model (src/lib/manual/embedder.ts).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from '@huggingface/transformers';

const MODEL = 'Xenova/bge-small-en-v1.5';
const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/data/manual');
const unitsFile = path.join(dataDir, 'units.json');
const outFile = path.join(dataDir, 'embeddings.json');
const { meta, units } = JSON.parse(fs.readFileSync(unitsFile, 'utf8'));

const WINDOW = 200;
const chunks = [];
for (const u of units) {
  const words = u.text.split(/\s+/).filter(Boolean);
  const context = [u.chapterTitle, ...u.path].filter(Boolean).join(' > ');
  for (let i = 0; i < Math.max(words.length, 1); i += WINDOW - 30) {
    chunks.push({ id: u.id, text: `${context}\n${words.slice(i, i + WINDOW).join(' ')}` });
    if (i + WINDOW >= words.length) break;
  }
}

const embed = await pipeline('feature-extraction', MODEL, { dtype: 'q8' });
const vecs = [];
const B = 32;
for (let i = 0; i < chunks.length; i += B) {
  const out = await embed(chunks.slice(i, i + B).map((c) => c.text), { pooling: 'cls', normalize: true });
  vecs.push(...out.tolist());
  if (i % 640 === 0) console.log(`${i}/${chunks.length}`);
}

// Store as int8 (scale 127) to keep the file small; cosine ranking is unaffected in practice.
const dim = vecs[0].length;
const q = new Int8Array(vecs.length * dim);
vecs.forEach((v, r) => v.forEach((x, c) => (q[r * dim + c] = Math.round(x * 127))));
fs.writeFileSync(
  outFile,
  JSON.stringify({
    model: MODEL,
    version: meta.version,
    dim,
    ids: chunks.map((c) => c.id),
    vectors: Buffer.from(q.buffer).toString('base64'),
  }),
);
console.log('chunks', chunks.length, 'dim', dim);
