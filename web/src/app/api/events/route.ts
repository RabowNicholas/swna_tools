import { after, NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { recordEvent, type EventType } from '@/lib/events/record';

// What the browser is allowed to report. Tool runs, manual questions and
// failures on the server are recorded server-side and can't be sent from here.
const BROWSER_EVENTS: ReadonlySet<EventType> = new Set([
  'page_view',
  'search',
  'client_error',
  'tool_used',
]);

const MAX_BODY = 4000;

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : null);

/** Receives usage events from src/lib/events/client.ts. */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY) {
    return NextResponse.json({ error: 'Too large' }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type = body.type as EventType;
  if (!BROWSER_EVENTS.has(type)) {
    return NextResponse.json({ error: 'Unknown event type' }, { status: 400 });
  }

  const props =
    body.props && typeof body.props === 'object' && !Array.isArray(body.props)
      ? (body.props as Record<string, unknown>)
      : {};

  // The person comes from the session, never from the body
  after(() =>
    recordEvent({
      type,
      userEmail: session.user?.email,
      userName: session.user?.name,
      tool: str(body.tool, 100),
      ok: type === 'client_error' ? false : typeof body.ok === 'boolean' ? body.ok : null,
      clientId: str(body.clientId, 100),
      source: str(body.source, 100),
      path: str(body.path, 300),
      error: str(body.error, 1000),
      props,
    })
  );

  return new NextResponse(null, { status: 204 });
}
