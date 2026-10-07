import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession, isAdmin } from '@/lib/auth';
import { sql } from '@/lib/events/db';
import * as usage from '@/lib/events/queries';
import { TOOL_SECTIONS, type Tool, type ToolSection } from '@/lib/tools';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { UsageTrend } from './UsageTrend';

export const dynamic = 'force-dynamic';

const RANGES = [7, 30, 90] as const;

// Routes that do a supporting job for another tool rather than being a tool
const OTHER_ACTIONS: Record<string, string> = {
  'ir-create': 'IR record created (from EE-10)',
  billing: 'Billing entry (from Doctor Letter)',
  clients: 'Client record updated from another page',
};

/**
 * Which tool a recorded run belongs to. Tracking slugs are the last segment of
 * the tool's address (rd-waiver → /forms/rd-waiver). The one exception is the
 * client-update route, which counts as Client Manager only when run from it.
 */
function toolFor(slug: string, path: string | null): { tool: Tool; section: ToolSection } | null {
  if (slug === 'clients' && path !== '/clients') return null;
  for (const section of TOOL_SECTIONS) {
    const tool = section.tools.find((t) => t.href.split('/').pop() === slug);
    if (tool) return { tool, section };
  }
  return null;
}

function ago(ts: string | Date | null): string {
  if (!ts) return '—';
  const mins = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const iso = (ts: string | Date) => new Date(ts).toISOString();

export default async function UsagePage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; mine?: string; env?: string }>;
}) {
  const session = await getSession();
  if (!isAdmin(session)) notFound();

  const params = await searchParams;
  const days = RANGES.find((r) => String(r) === params.days) ?? 30;
  const showMine = params.mine === 'show';
  const allEnvs = params.env === 'all';
  const filter: usage.UsageFilter = {
    days,
    hideEmail: showMine ? null : session?.user?.email ?? null,
    productionOnly: !allEnvs,
  };

  const href = (change: Partial<{ days: number; mine: boolean; env: boolean }>) => {
    const next = { days, mine: showMine, env: allEnvs, ...change };
    const qs = new URLSearchParams();
    if (next.days !== 30) qs.set('days', String(next.days));
    if (next.mine) qs.set('mine', 'show');
    if (next.env) qs.set('env', 'all');
    const s = qs.toString();
    return `/admin/usage${s ? `?${s}` : ''}`;
  };

  if (!sql) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader title="Usage" description="How the app is being used." />
        <Panel title="Not connected">
          <p className="text-sm text-muted-foreground">
            DATABASE_URL isn’t set, so nothing is being recorded. Add Neon Postgres to the project in
            Vercel (Storage), then run <code>node scripts/migrate.mjs</code> from <code>web/</code>.
          </p>
        </Panel>
      </div>
    );
  }

  let data;
  try {
    data = await Promise.all([
      usage.failures(filter),
      usage.runsByTool(filter),
      usage.viewsByPath(filter),
      usage.runsByPerson(filter),
      usage.lastActive(filter),
      usage.weeklyRuns(filter),
      usage.searches(filter),
      usage.manualQuestions(filter),
    ]);
  } catch (err) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader title="Usage" description="How the app is being used." />
        <Panel title="Couldn’t read usage data">
          <p className="text-sm text-muted-foreground">
            The database didn’t answer. If it’s newly connected, run <code>node scripts/migrate.mjs</code> from{' '}
            <code>web/</code> to create the table. The tools themselves aren’t affected.
          </p>
          <p className="mt-2 font-mono text-xs text-muted-foreground">{err instanceof Error ? err.message : String(err)}</p>
        </Panel>
      </div>
    );
  }
  const [failures, runs, views, personRuns, people, weekly, searches, questions] = data;

  // Tool table: every tool in the app, used or not
  const viewCount = new Map(views.map((v) => [v.path, v.views]));
  const byTool = new Map<string, { runs: number; failed: number; people: number; last: string | null }>();
  const other = new Map<string, { runs: number; failed: number }>();
  for (const r of runs) {
    const found = toolFor(r.tool, r.path);
    if (found) {
      const t = byTool.get(found.tool.href) ?? { runs: 0, failed: 0, people: 0, last: null };
      t.runs += r.runs;
      t.failed += r.failed;
      // Approximate when a route serves several pages; exact for nearly every tool
      t.people = Math.max(t.people, r.people);
      if (!t.last || new Date(r.last_run) > new Date(t.last)) t.last = r.last_run;
      byTool.set(found.tool.href, t);
    } else {
      const key = OTHER_ACTIONS[r.tool] ?? r.tool;
      const o = other.get(key) ?? { runs: 0, failed: 0 };
      o.runs += r.runs;
      o.failed += r.failed;
      other.set(key, o);
    }
  }
  const toolRows = TOOL_SECTIONS.flatMap((section) =>
    section.tools.map((tool) => ({
      tool,
      section,
      views: viewCount.get(tool.href) ?? 0,
      ...(byTool.get(tool.href) ?? { runs: 0, failed: 0, people: 0, last: null }),
    }))
  ).sort((a, b) => b.runs - a.runs || b.views - a.views);
  const used = toolRows.filter((r) => r.runs > 0 || r.views > 0);
  const unused = toolRows.filter((r) => r.runs === 0 && r.views === 0);
  const totalRuns = toolRows.reduce((n, r) => n + r.runs, 0);

  // People: each person's top tools
  const personTools = new Map<string, Map<string, number>>();
  for (const r of personRuns) {
    const name = toolFor(r.tool, r.path)?.tool.name ?? OTHER_ACTIONS[r.tool] ?? r.tool;
    const key = r.user_email ?? 'unknown';
    const m = personTools.get(key) ?? new Map<string, number>();
    m.set(name, (m.get(name) ?? 0) + r.runs);
    personTools.set(key, m);
  }
  const personRows = people
    .map((p) => {
      const tools = [...(personTools.get(p.user_email ?? 'unknown') ?? new Map()).entries()].sort((a, b) => b[1] - a[1]);
      return { ...p, runs: tools.reduce((n, [, c]) => n + c, 0), tools };
    })
    .sort((a, b) => b.runs - a.runs || b.views - a.views);

  const zeroResult = searches.filter((s) => s.results === 0);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        title="Usage"
        description="Who’s using which tools, what breaks, and what people look for."
        actions={
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Segmented
              label="Range"
              options={RANGES.map((r) => ({ label: `${r} days`, href: href({ days: r }), active: r === days }))}
            />
            <Segmented
              label="Your activity"
              options={[
                { label: 'Hide mine', href: href({ mine: false }), active: !showMine },
                { label: 'Show mine', href: href({ mine: true }), active: showMine },
              ]}
            />
            <Segmented
              label="Environment"
              options={[
                { label: 'Live site', href: href({ env: false }), active: !allEnvs },
                { label: 'All', href: href({ env: true }), active: allEnvs },
              ]}
            />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Tool runs" value={totalRuns} />
        <Stat label="People active" value={personRows.length} />
        <Stat label="Tools used" value={used.filter((r) => r.runs > 0).length} of={toolRows.length} />
        <Stat label="Failures" value={failures.length} alert={failures.length > 0} />
      </div>

      <Panel title="Failures" subtitle="Tools that errored on the server, and crashes in someone’s browser. Newest first.">
        {failures.length === 0 ? (
          <Empty>Nothing broke in this period.</Empty>
        ) : (
          <Table head={['When', 'Who', 'Where', 'Error']}>
            {failures.map((f, i) => (
              <tr key={i} className="border-b border-border/50 align-top">
                <Td muted title={iso(f.ts)}>{ago(f.ts)}</Td>
                <Td>{f.user_name ?? '—'}</Td>
                <Td>
                  {f.type === 'client_error' ? 'Browser' : f.tool}
                  {f.path && <div className="text-xs text-muted-foreground">{f.path}</div>}
                </Td>
                <Td className="font-mono text-xs break-all">
                  {f.status ? `${f.status} · ` : ''}
                  {f.error ?? 'No message'}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>

      <Panel title="Runs per week" subtitle="Successful tool runs, everyone combined.">
        {weekly.length === 0 ? <Empty>No runs yet.</Empty> : <UsageTrend data={weekly} />}
      </Panel>

      <Panel
        title="Tools"
        subtitle="Views are page opens. A tool with views but few runs may be confusing or broken."
      >
        <Table head={['Tool', 'Views', 'Runs', 'Failed', 'People', 'Last run']} numeric={[1, 2, 3, 4]}>
          {used.map((r) => (
            <tr key={r.tool.href} className="border-b border-border/50">
              <Td>
                <Link href={r.tool.href} className="text-foreground hover:underline">{r.tool.name}</Link>
                <div className="text-xs text-muted-foreground">{r.section.title}</div>
              </Td>
              <Td num>{r.views}</Td>
              <Td num>{r.runs || '—'}</Td>
              <Td num alert={r.failed > 0}>{r.failed || '—'}</Td>
              <Td num>{r.people || '—'}</Td>
              <Td muted title={r.last ? iso(r.last) : undefined}>{ago(r.last)}</Td>
            </tr>
          ))}
          {[...other.entries()].map(([name, o]) => (
            <tr key={name} className="border-b border-border/50">
              <Td muted>{name}</Td>
              <Td num>—</Td>
              <Td num>{o.runs}</Td>
              <Td num alert={o.failed > 0}>{o.failed || '—'}</Td>
              <Td num>—</Td>
              <Td muted>—</Td>
            </tr>
          ))}
        </Table>
        {unused.length > 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Not opened in this period:</span>{' '}
            {unused.map((r) => r.tool.name).join(', ')}
          </p>
        )}
      </Panel>

      <Panel title="People">
        {personRows.length === 0 ? (
          <Empty>No activity yet.</Empty>
        ) : (
          <Table head={['Person', 'Last active', 'Views', 'Runs', 'Most used']} numeric={[2, 3]}>
            {personRows.map((p) => (
              <tr key={p.user_email ?? 'unknown'} className="border-b border-border/50 align-top">
                <Td>{p.user_name ?? p.user_email}</Td>
                <Td muted title={iso(p.last_seen)}>{ago(p.last_seen)}</Td>
                <Td num>{p.views}</Td>
                <Td num>{p.runs || '—'}</Td>
                <Td muted>
                  {p.tools.length
                    ? p.tools.slice(0, 4).map(([name, n]) => `${name} ×${n}`).join(', ')
                    : '—'}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Panel title="Searches" subtitle="What people typed in “Find a tool”.">
          {searches.length === 0 ? (
            <Empty>No searches yet.</Empty>
          ) : (
            <>
              {zeroResult.length > 0 && (
                <p className="mb-3 text-sm">
                  <span className="font-medium text-foreground">Found nothing:</span>{' '}
                  <span className="text-muted-foreground">
                    {zeroResult.map((s) => `“${s.query}”${s.searches > 1 ? ` ×${s.searches}` : ''}`).join(', ')}
                  </span>
                </p>
              )}
              <Table head={['Search', 'Times', 'Results', 'Picked one']} numeric={[1, 2, 3]}>
                {searches.slice(0, 20).map((s) => (
                  <tr key={s.query} className="border-b border-border/50">
                    <Td>{s.query}</Td>
                    <Td num>{s.searches}</Td>
                    <Td num>{s.results}</Td>
                    <Td num>{s.picked}</Td>
                  </tr>
                ))}
              </Table>
            </>
          )}
        </Panel>

        <Panel title="Procedure Manual questions" subtitle="Newest first.">
          {questions.length === 0 ? (
            <Empty>No questions yet.</Empty>
          ) : (
            <ul className="divide-y divide-border/50">
              {questions.map((m, i) => (
                <li key={i} className="py-2 text-sm">
                  <div className="text-foreground">{m.question}</div>
                  <div className="text-xs text-muted-foreground" title={iso(m.ts)}>
                    {m.user_name ?? '—'} · {ago(m.ts)}
                    {!m.answered && <> · <span className="text-destructive">no answer</span>{m.reason ? ` (${m.reason})` : ''}</>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Segmented({ label, options }: { label: string; options: { label: string; href: string; active: boolean }[] }) {
  return (
    <nav aria-label={label} className="flex gap-0.5 rounded-lg bg-accent p-0.5">
      {options.map((o) => (
        <Link
          key={o.label}
          href={o.href}
          aria-current={o.active ? 'true' : undefined}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            o.active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}

function Stat({ label, value, of, alert }: { label: string; value: number; of?: number; alert?: boolean }) {
  return (
    <div className="rounded-xl border border-card-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('mt-1 text-2xl font-semibold tabular-nums', alert ? 'text-destructive' : 'text-foreground')}>
        {value}
        {of != null && <span className="text-base font-normal text-muted-foreground"> / {of}</span>}
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-card-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function Table({ head, numeric = [], children }: { head: string[]; numeric?: number[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            {head.map((h, i) => (
              <th key={h} className={cn('py-2 pr-4 font-medium', numeric.includes(i) && 'text-right')}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Td({
  children,
  num,
  muted,
  alert,
  className,
  title,
}: {
  children: React.ReactNode;
  num?: boolean;
  muted?: boolean;
  /** Failure counts: red instead of the usual ink */
  alert?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <td
      title={title}
      className={cn(
        'py-2 pr-4',
        num && 'text-right tabular-nums',
        alert ? 'font-medium text-destructive' : muted ? 'text-muted-foreground' : 'text-foreground',
        className
      )}
    >
      {children}
    </td>
  );
}
