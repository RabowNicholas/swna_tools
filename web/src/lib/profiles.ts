import { sql } from "@/lib/events/db";

// Each person's name and initials as they set them in Settings, stored in the
// same Neon database as the usage events. Server only.

export interface Profile {
  name: string;
  initials: string;
}

// The session is read on nearly every request, so rows are kept for a minute
// rather than queried each time. Saving clears this instance's copy; others
// catch up within the minute.
const CACHE_MS = 60_000;
const cache = new Map<string, { at: number; profile: Profile | null }>();

/**
 * The saved name and initials for this email, or null if they never changed
 * them (or the database isn't reachable, in which case the defaults in
 * users.ts stand).
 */
export async function getProfile(email: string): Promise<Profile | null> {
  const key = email.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.profile;
  if (!sql) return null;

  try {
    const rows = (await sql`select name, initials from profiles where email = ${key}`) as Profile[];
    const profile = rows[0] ?? null;
    cache.set(key, { at: Date.now(), profile });
    return profile;
  } catch (e) {
    console.error("[profiles] read failed:", e);
    return null;
  }
}

/** Saves the name and initials for this email. Throws if it can't. */
export async function saveProfile(email: string, profile: Profile): Promise<void> {
  if (!sql) throw new Error("The database isn’t set up here, so this can’t be saved.");
  const key = email.toLowerCase();
  await sql`
    insert into profiles (email, name, initials)
    values (${key}, ${profile.name}, ${profile.initials})
    on conflict (email) do update
      set name = excluded.name, initials = excluded.initials, updated_at = now()
  `;
  cache.set(key, { at: Date.now(), profile });
}
