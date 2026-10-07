import { neon } from '@neondatabase/serverless';

/**
 * The usage-events database (Neon Postgres, attached through Vercel).
 *
 * Null when DATABASE_URL isn't set, e.g. local dev without a database. Every
 * caller treats that as "tracking is off" rather than an error, so the tools
 * themselves never depend on it.
 */
export const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
