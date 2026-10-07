// Applies every scripts/sql/*.sql file, in name order, to DATABASE_URL.
// Each file is written to be safe to re-run.
//
//   DATABASE_URL=postgres://... node scripts/migrate.mjs
//
// Run from web/. The driver lives in the repo-root node_modules, which Node
// finds by walking up from here.

import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Set DATABASE_URL first (Vercel → Storage → your Neon database → .env.local tab).');
  process.exit(1);
}

const dir = join(dirname(fileURLToPath(import.meta.url)), 'sql');
const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();

const pool = new Pool({ connectionString: url });
try {
  for (const file of files) {
    await pool.query(await readFile(join(dir, file), 'utf8'));
    console.log(`applied ${file}`);
  }
} finally {
  await pool.end();
}
