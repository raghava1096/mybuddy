import pg from 'pg'
import { PGlite } from '@electric-sql/pglite'

// one small query function for the rest of the code.
// in production we use real postgres (neon) through DATABASE_URL.
// locally, with no DATABASE_URL, we use pglite: postgres running in-process, saved to ./.pgdata
type Row = Record<string, any>
type QueryFn = (text: string, params?: unknown[]) => Promise<Row[]>

let run: QueryFn
let close: () => Promise<void>

if (process.env.DATABASE_URL) {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
  })
  run = async (text, params) => (await pool.query(text, params as any[])).rows
  close = () => pool.end()
  console.log('db: postgres')
} else {
  const lite = new PGlite(process.env.PGLITE_DIR ?? './.pgdata')
  run = async (text, params) => (await lite.query<Row>(text, params as any[])).rows
  close = () => lite.close()
  console.log('db: pglite (local)')
}

export const query = (text: string, params?: unknown[]) => run(text, params)
export const closeDb = () => close()

export const schema = `
create table if not exists plans (
  id text primary key,
  kind text not null check (kind in ('trip', 'event', 'personal')),
  name text not null,
  destination text,
  start_date date,
  end_date date,
  budget integer,
  created_at timestamptz not null default now()
);

create table if not exists members (
  id text primary key,
  plan_id text not null references plans(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  is_host boolean not null default false
);

create table if not exists expenses (
  id text primary key,
  plan_id text not null references plans(id) on delete cascade,
  title text not null,
  category text not null,
  amount integer not null check (amount > 0),
  paid_by text not null references members(id) on delete cascade,
  spent_on date not null,
  split_type text not null,
  created_at timestamptz not null default now()
);

create table if not exists expense_shares (
  expense_id text not null references expenses(id) on delete cascade,
  member_id text not null references members(id) on delete cascade,
  amount integer not null,
  primary key (expense_id, member_id)
);

create table if not exists settlements (
  id text primary key,
  plan_id text not null references plans(id) on delete cascade,
  from_member text not null references members(id) on delete cascade,
  to_member text not null references members(id) on delete cascade,
  amount integer not null check (amount > 0),
  paid_on date not null default current_date
);

create table if not exists itinerary_items (
  id text primary key,
  plan_id text not null references plans(id) on delete cascade,
  day integer not null,
  time text,
  kind text not null,
  title text not null,
  place text,
  travel_mode text,
  cost integer not null default 0,
  notes text
);

create index if not exists expenses_plan_idx on expenses(plan_id);
create index if not exists expenses_spent_idx on expenses(spent_on);
create index if not exists members_plan_idx on members(plan_id);
create index if not exists items_plan_idx on itinerary_items(plan_id);
`

export async function migrate() {
  // pglite and pg both accept several statements in one call only without params,
  // so split them and run one by one
  for (const stmt of schema.split(';').map((s) => s.trim()).filter(Boolean)) {
    await query(stmt)
  }
}
