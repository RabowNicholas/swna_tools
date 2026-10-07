import { after, type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { recordEvent } from './record';
import { SOURCE_HEADER } from './source';

type Handler = (request: NextRequest) => Promise<Response>;

/**
 * Wraps a tool's POST route so every run is recorded: who ran it, for which
 * client, from which page, whether it worked, how long it took, and the error
 * if it didn't. The handler and its response are untouched, and the record is
 * written after the response has gone out.
 *
 *   async function handlePOST(request: NextRequest) { ... }
 *   export const POST = withToolTracking('rd-waiver', handlePOST);
 */
export function withToolTracking(tool: string, handler: Handler): Handler {
  return async (request) => {
    const started = Date.now();
    // Read our copy of the body after the handler has read its own
    const bodyCopy = request.clone();

    let response: Response;
    let thrown: unknown = null;
    try {
      response = await handler(request);
    } catch (err) {
      thrown = err;
      response = Response.json({ error: 'Internal server error' }, { status: 500 });
    }
    const durationMs = Date.now() - started;
    const status = response.status;
    const errorCopy = status >= 400 ? response.clone() : null;

    after(async () => {
      const session = await getSession().catch(() => null);
      await recordEvent({
        type: 'tool_run',
        tool,
        userEmail: session?.user?.email,
        userName: session?.user?.name,
        ok: status < 400,
        status,
        durationMs,
        clientId: await readClientId(bodyCopy),
        source: request.headers.get(SOURCE_HEADER),
        path: refererPath(request),
        error: thrown
          ? thrown instanceof Error ? thrown.message : String(thrown)
          : errorCopy ? await readErrorMessage(errorCopy) : null,
      });
    });

    if (thrown) throw thrown;
    return response;
  };
}

/** The page the request came from, e.g. /forms/rd-waiver */
export function refererPath(request: Request): string | null {
  const referer = request.headers.get('referer');
  if (!referer) return null;
  try {
    return new URL(referer).pathname;
  } catch {
    return null;
  }
}

/**
 * The Airtable record ID out of whichever shape the route takes:
 * `client_record` (JSON or a multipart field holding JSON), `recordId` or
 * `clientId`. Only the ID is kept; the rest of the record never leaves here.
 */
async function readClientId(request: Request): Promise<string | null> {
  try {
    const type = request.headers.get('content-type') ?? '';
    if (type.includes('multipart/form-data')) {
      const raw = (await request.formData()).get('client_record');
      return typeof raw === 'string' ? (JSON.parse(raw)?.id ?? null) : null;
    }
    const body = await request.json();
    const id = body?.client_record?.id ?? body?.recordId ?? body?.clientId;
    return typeof id === 'string' ? id : null;
  } catch {
    return null;
  }
}

async function readErrorMessage(response: Response): Promise<string | null> {
  try {
    const body = await response.json();
    const parts = [body?.error, body?.message ?? body?.details].filter(
      (p): p is string => typeof p === 'string' && p.length > 0
    );
    return parts.length ? parts.join(': ') : `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}
