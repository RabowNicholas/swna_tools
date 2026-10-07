import { after, NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { askManual } from '@/lib/manual/answer';
import { recordEvent } from '@/lib/events/record';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const { question, sourceIds } = await request.json();
    if (typeof question !== 'string' || !question.trim()) {
      return NextResponse.json({ error: 'Missing question' }, { status: 400 });
    }
    if (question.length > 2000) {
      return NextResponse.json({ error: 'Question is too long' }, { status: 400 });
    }

    const ids = Array.isArray(sourceIds) ? sourceIds.filter((id): id is string => typeof id === 'string') : undefined;
    const started = Date.now();
    const result = await askManual(question.trim(), ids);

    // What people ask shows where the manual (and the app) has gaps
    after(() =>
      recordEvent({
        type: 'manual_ask',
        tool: 'procedure-manual',
        userEmail: session.user?.email,
        userName: session.user?.name,
        ok: !!result.answer,
        durationMs: Date.now() - started,
        path: '/guides/procedure-manual',
        error: result.unavailableReason ?? null,
        props: { question: question.trim().slice(0, 500), sources: result.sources.length },
      })
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Procedure Manual ask error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
