-- btree_gist lets a GiST index combine plain equality (court_id) with range
-- overlap (&&), which is what the exclusion constraint below needs.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE booking_status AS ENUM ('confirmed', 'cancelled');

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'user',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE courts (
  id                 SERIAL PRIMARY KEY,
  name               TEXT NOT NULL UNIQUE,
  sport              TEXT NOT NULL,
  hourly_price_cents INTEGER NOT NULL CHECK (hourly_price_cents >= 0),
  -- Whole hours in facility local time; close_hour = 24 means midnight.
  open_hour          SMALLINT NOT NULL CHECK (open_hour BETWEEN 0 AND 23),
  close_hour         SMALLINT NOT NULL CHECK (close_hour BETWEEN 1 AND 24),
  is_active          BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (open_hour < close_hour)
);

CREATE TABLE bookings (
  id           SERIAL PRIMARY KEY,
  court_id     INTEGER NOT NULL REFERENCES courts(id) ON DELETE RESTRICT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  starts_at    TIMESTAMPTZ NOT NULL,
  ends_at      TIMESTAMPTZ NOT NULL,
  -- Price snapshot at booking time: later court price edits must not
  -- rewrite what a customer agreed to pay (or historical revenue).
  price_cents  INTEGER NOT NULL CHECK (price_cents >= 0),
  status       booking_status NOT NULL DEFAULT 'confirmed',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,

  CHECK (ends_at - starts_at IN (INTERVAL '1 hour', INTERVAL '2 hours')),
  CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL)),

  -- The double-booking guarantee: no two *confirmed* bookings on the same
  -- court may have overlapping [starts_at, ends_at) ranges. Postgres checks
  -- this atomically on insert, so concurrent transactions cannot both win.
  CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
    court_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status = 'confirmed')
);

CREATE INDEX bookings_user_starts_idx ON bookings (user_id, starts_at DESC);
CREATE INDEX bookings_starts_idx ON bookings (starts_at);
