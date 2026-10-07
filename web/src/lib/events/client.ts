/**
 * Reports a usage event from the browser to /api/events. Fire-and-forget:
 * it never throws and never delays the page.
 *
 * Who did it comes from the session on the server, so it isn't passed here.
 * clientId is the Airtable record ID only — never a name.
 */
export interface BrowserEvent {
  type: 'page_view' | 'search' | 'client_error' | 'tool_used';
  tool?: string;
  ok?: boolean;
  clientId?: string;
  source?: string;
  /** Defaults to the current page */
  path?: string;
  error?: string;
  props?: Record<string, string | number | boolean | null>;
}

export function track(event: BrowserEvent): void {
  if (typeof window === 'undefined') return;
  try {
    const body = JSON.stringify({ path: window.location.pathname, ...event });
    const blob = new Blob([body], { type: 'application/json' });
    // sendBeacon survives the page navigating away; fetch is the fallback
    if (!navigator.sendBeacon?.('/api/events', blob)) {
      fetch('/api/events', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
    }
  } catch {
    // Tracking must never break the page
  }
}

/** Reports a crash, once per message per page load so a render loop can't flood it. */
const reported = new Set<string>();
export function trackError(error: unknown, source: string): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const key = `${window.location.pathname}|${err.message}`;
  if (reported.has(key)) return;
  reported.add(key);
  const frame = err.stack?.split('\n').find((l) => l.trim().startsWith('at '))?.trim() ?? null;
  track({ type: 'client_error', source, error: err.message, props: { frame } });
}
