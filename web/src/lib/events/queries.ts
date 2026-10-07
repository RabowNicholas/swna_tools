import { sql } from './db';

/** What the dashboard is looking at. */
export interface UsageFilter {
  days: number;
  /** Leave this person's activity out (Nick's own testing) */
  hideEmail: string | null;
  productionOnly: boolean;
}

// Every query shares the same three filters as $1..$3, so each one starts
// from this clause and adds its own conditions.
const BASE = `ts >= now() - make_interval(days => $1::int)
  and ($2::text is null or user_email is distinct from $2::text)
  and (not $3::boolean or env = 'production')`;

// A "run" is someone finishing a tool, wherever it finished. Generator calls
// driven by Claims Assembly count toward Claims Assembly, not the EE-1/EE-3.
const RUN = `type in ('tool_run', 'tool_used', 'manual_ask') and source is null`;

async function q<T>(text: string, f: UsageFilter): Promise<T[]> {
  if (!sql) return [];
  return (await sql.query(text, [f.days, f.hideEmail, f.productionOnly])) as T[];
}

export interface Failure {
  ts: string;
  type: string;
  tool: string | null;
  user_name: string | null;
  path: string | null;
  status: number | null;
  error: string | null;
}

export const failures = (f: UsageFilter) =>
  q<Failure>(
    `select ts, type, tool, user_name, path, status, error from events
     where ${BASE} and ((type = 'tool_run' and ok = false) or type = 'client_error')
     order by ts desc limit 100`,
    f
  );

export interface ToolRunRow {
  tool: string;
  path: string | null;
  runs: number;
  failed: number;
  people: number;
  last_run: string;
}

/** Runs per tool and the page they came from (the same route serves several pages). */
export const runsByTool = (f: UsageFilter) =>
  q<ToolRunRow>(
    `select tool, path, count(*)::int as runs,
            count(*) filter (where ok = false)::int as failed,
            count(distinct user_email)::int as people,
            max(ts) as last_run
     from events where ${BASE} and ${RUN} and tool is not null
     group by tool, path`,
    f
  );

export const viewsByPath = (f: UsageFilter) =>
  q<{ path: string; views: number }>(
    `select path, count(*)::int as views from events
     where ${BASE} and type = 'page_view' and path is not null group by path`,
    f
  );

export interface PersonToolRow {
  user_name: string | null;
  user_email: string | null;
  tool: string;
  path: string | null;
  runs: number;
}

export const runsByPerson = (f: UsageFilter) =>
  q<PersonToolRow>(
    `select user_name, user_email, tool, path, count(*)::int as runs from events
     where ${BASE} and ${RUN} and tool is not null
     group by user_name, user_email, tool, path`,
    f
  );

export const lastActive = (f: UsageFilter) =>
  q<{ user_name: string | null; user_email: string | null; last_seen: string; views: number }>(
    `select user_name, user_email, max(ts) as last_seen,
            count(*) filter (where type = 'page_view')::int as views
     from events where ${BASE} and user_email is not null
     group by user_name, user_email`,
    f
  );

export const weeklyRuns = (f: UsageFilter) =>
  q<{ week: string; runs: number }>(
    `select to_char(date_trunc('week', ts), 'YYYY-MM-DD') as week, count(*)::int as runs
     from events where ${BASE} and ${RUN} and ok is not false
     group by 1 order by 1`,
    f
  );

export interface SearchRow {
  query: string;
  searches: number;
  results: number;
  picked: number;
}

export const searches = (f: UsageFilter) =>
  q<SearchRow>(
    `select lower(props->>'query') as query, count(*)::int as searches,
            min((props->>'results')::int)::int as results,
            count(*) filter (where props->>'picked' is not null)::int as picked
     from events where ${BASE} and type = 'search' and props ? 'query'
     group by 1 order by searches desc, query limit 50`,
    f
  );

export interface ManualQuestion {
  ts: string;
  user_name: string | null;
  question: string;
  answered: boolean;
  reason: string | null;
}

export const manualQuestions = (f: UsageFilter) =>
  q<ManualQuestion>(
    `select ts, user_name, props->>'question' as question, coalesce(ok, false) as answered,
            error as reason
     from events where ${BASE} and type = 'manual_ask'
     order by ts desc limit 50`,
    f
  );
