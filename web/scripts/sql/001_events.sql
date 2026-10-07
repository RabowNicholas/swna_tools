-- One row per thing someone did in the app: ran a tool, opened a page,
-- searched, asked the manual, or hit an error. See src/lib/events/.
--
-- client_id is the Airtable record ID only. Names, diagnoses and form
-- contents never go in here.

create table if not exists events (
  id          bigserial primary key,
  ts          timestamptz not null default now(),
  env         text not null,          -- VERCEL_ENV: production / preview / development
  user_email  text,
  user_name   text,
  type        text not null,          -- tool_run | tool_used | manual_ask | page_view | search | client_error
  tool        text,                   -- slug, e.g. 'rd-waiver'
  ok          boolean,
  status      int,
  duration_ms int,
  client_id   text,
  source      text,                   -- what drove it, e.g. 'claims-assembly'
  path        text,
  error       text,
  props       jsonb not null default '{}'
);

create index if not exists events_ts_idx on events (ts desc);
create index if not exists events_type_tool_ts_idx on events (type, tool, ts desc);
