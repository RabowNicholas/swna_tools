// Browser-side question embedding for semantic search. The model (~35 MB) is
// downloaded once from the Hugging Face CDN and cached by the browser; until
// it's ready, search runs keyword-only.

const MODEL = 'Xenova/bge-small-en-v1.5'; // must match scripts/manual/embed-manual.mjs
const QUERY_PREFIX = 'Represent this sentence for searching relevant passages: ';

type Embed = (text: string) => Promise<Float32Array>;
let loading: Promise<Embed> | null = null;

export function loadEmbedder(): Promise<Embed> {
  loading ??= (async () => {
    const { pipeline } = await import('@huggingface/transformers');
    const extractor = await pipeline('feature-extraction', MODEL, { dtype: 'q8' });
    return async (text: string) => {
      const out = await extractor(QUERY_PREFIX + text, { pooling: 'cls', normalize: true });
      return out.data as Float32Array;
    };
  })();
  loading.catch(() => (loading = null));
  return loading;
}
