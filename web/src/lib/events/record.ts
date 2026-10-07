import { sql } from './db';

export type EventType =
  | 'tool_run'      // a server route did its job (or failed to)
  | 'tool_used'     // a tool that finishes in the browser, e.g. Claims Assembly
  | 'manual_ask'    // a Procedure Manual question
  | 'page_view'
  | 'search'        // the sidebar's "Find a tool" box
  | 'client_error'; // a crash in someone's browser

export interface UsageEvent {
  type: EventType;
  userEmail?: string | null;
  userName?: string | null;
  tool?: string | null;
  ok?: boolean | null;
  status?: number | null;
  durationMs?: number | null;
  /** The Airtable record ID. Never a name. */
  clientId?: string | null;
  source?: string | null;
  path?: string | null;
  error?: string | null;
  props?: Record<string, unknown>;
}

const clip = (s: string | null | undefined, max: number) =>
  s == null ? null : String(s).slice(0, max);

/**
 * Writes one usage event. Never throws: losing an event is always better than
 * failing the thing the person was actually doing.
 *
 * Call it inside `after()` from next/server so the response doesn't wait on it.
 */
export async function recordEvent(e: UsageEvent): Promise<void> {
  if (!sql) return;
  try {
    await sql`
      insert into events
        (env, user_email, user_name, type, tool, ok, status, duration_ms,
         client_id, source, path, error, props)
      values
        (${process.env.VERCEL_ENV ?? 'development'}, ${clip(e.userEmail, 200)},
         ${clip(e.userName, 200)}, ${e.type}, ${clip(e.tool, 100)}, ${e.ok ?? null},
         ${e.status ?? null}, ${e.durationMs == null ? null : Math.round(e.durationMs)},
         ${clip(e.clientId, 100)}, ${clip(e.source, 100)}, ${clip(e.path, 300)},
         ${clip(e.error, 1000)}, ${JSON.stringify(e.props ?? {})})
    `;
  } catch (err) {
    console.error('[events] Could not record event:', err);
  }
}
