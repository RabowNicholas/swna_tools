import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { askManual } from '@/lib/manual/answer';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const { question, sourceIds } = await request.json();
    if (typeof question !== 'string' || !question.trim()) {
      return NextResponse.json({ error: 'Missing question' }, { status: 400 });
    }
    if (question.length > 2000) {
      return NextResponse.json({ error: 'Question is too long' }, { status: 400 });
    }

    const ids = Array.isArray(sourceIds) ? sourceIds.filter((id): id is string => typeof id === 'string') : undefined;
    return NextResponse.json(await askManual(question.trim(), ids));
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
