-- Jetline: bookings, invoice letterhead, and login throttling.
--
-- Netlify applies these SQL files itself, immediately before a production
-- deploy publishes; a failure here blocks the publish. Drizzle is the query
-- and type layer, not the migration runner.

create table if not exists bookings (
  id               uuid primary key default gen_random_uuid(),
  customer_name    text not null,
  phone            text not null,
  email            text,

  -- What the operator typed, in their own local time. These are what the form
  -- shows and what the run sheet prints.
  pickup_date      date not null,
  pickup_time      time not null,

  -- The same moment as an absolute instant, resolved through settings.timezone
  -- at write time. Everything that compares against "now" uses this column:
  -- comparing a naive local time against a UTC clock flips a booking's status
  -- hours early or late.
  pickup_at        timestamptz not null,

  pickup_location  text not null,
  dropoff_location text not null,
  vehicle          text not null,
  passengers       integer not null check (passengers > 0),
  price            numeric(10,2) not null check (price >= 0),
  notes            text,

  -- 'in progress' is deliberately absent: it is a window in time, derived from
  -- pickup_at, never stored. See app/lib/booking-status.ts.
  status           text not null default 'scheduled'
                     check (status in ('scheduled', 'completed', 'canceled')),
  completed_at     timestamptz,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- The run sheet is always ordered by time, and the hourly sweep selects on
-- status plus pickup_at.
create index if not exists bookings_pickup_at_idx on bookings (pickup_at);
create index if not exists bookings_status_pickup_at_idx on bookings (status, pickup_at);

-- Search by customer name, phone, or either location.
create index if not exists bookings_search_idx on bookings using gin (
  to_tsvector('simple',
    customer_name || ' ' || phone || ' ' || pickup_location || ' ' || dropoff_location)
);

-- Invoice letterhead. Exactly one row, enforced by the primary key check.
create table if not exists settings (
  id           integer primary key default 1 check (id = 1),
  company_name text not null,
  phone        text not null,
  email        text not null,
  address      text not null,

  -- IANA name. Interprets pickup_date + pickup_time into pickup_at, so it must
  -- be right before the first booking is entered.
  timezone     text not null default 'America/Toronto',
  updated_at   timestamptz not null default now()
);

-- Placeholders so the Settings screen has a row to edit rather than a null state.
insert into settings (id, company_name, phone, email, address)
values (1, 'Jetline', '', '', '')
on conflict (id) do nothing;

-- Throttles the shared password. A counter held in memory is useless across
-- serverless instances, so attempts are counted here.
create table if not exists auth_attempts (
  ip           text primary key,
  attempts     integer not null default 0,
  locked_until timestamptz,
  updated_at   timestamptz not null default now()
);
