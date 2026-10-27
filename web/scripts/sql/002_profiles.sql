-- Each person's own name and initials, set in Settings. Overrides the
-- defaults in src/lib/users.ts; a row only exists once someone edits theirs.

create table if not exists profiles (
  email       text primary key,       -- lowercase
  name        text not null,
  initials    text not null,
  updated_at  timestamptz not null default now()
);
