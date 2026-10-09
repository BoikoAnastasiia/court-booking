# Court Booking

Mid-Level Fullstack Software Developer Challenge for Procimo.

A simple booking and resource-management platform with real business rules: users book sports courts at a facility.

| Role      | Can do                                                                                      |
| --------- | ------------------------------------------------------------------------------------------- |
| **User**  | Browse courts, see availability, create and cancel their own bookings                       |
| **Admin** | Manage courts (create / edit / deactivate) and see all bookings — but can't book themselves |

## How to run

**Requirements:** Docker with Compose v2.

```bash
git clone git@github.com:BoikoAnastasiia/court-booking.git
cd court-booking
docker compose up
```

Postgres starts, the backend applies migrations and seeds demo data, then the frontend is served. The seed only runs on an empty database, so restarting won't duplicate data.

| Service  | URL                                                     |
| -------- | ------------------------------------------------------- |
| App      | http://localhost:8080                                   |
| API      | http://localhost:4000/api                               |
| Postgres | `localhost:5433` (user / password: `courts` / `courts`) |

### Seeded logins

| Role  | Email               | Password      |
| ----- | ------------------- | ------------- |
| User  | `alice@example.com` | `password123` |
| User  | `bob@example.com`   | `password123` |
| Admin | `admin@example.com` | `admin123`    |

**Seed contents:** 4 courts (one of them inactive, with booking history) and bookings from 2 days ago to 3 days ahead. Dates are relative to today, so there's always something upcoming and something past to look at.

### Useful commands

```bash
docker compose run --rm backend-test   # run backend tests
docker compose down -v                 # stop and wipe the database (next `up` re-seeds it)
```

**Ports taken?** If 8080, 4000 or 5433 is already in use, change the left-hand number in `docker-compose.yml`.

## Stack

React + Vite · Express 5 · PostgreSQL with plain SQL migrations (no ORM) · Zod for input validation · JWT for login · Vitest + Supertest against a real Postgres.

**React over Next** — the app doesn't require SEO, it's just a simple SPA.

**Express over Nest** — for the same reason. Express gives everything we need for a simple backend: it's minimalistic, unopinionated and lightweight, and doesn't require an Angular-like modular structure with controllers, providers and modules.

**PostgreSQL over NoSQL** — our data is structured and we aren't going to scale horizontally, so it's a vote for an SQL database. And Postgress could enforce "no overlapping time ranges" itself, which is how double bookings are blocked.

## How double bookings are prevented

The database itself guarantees it, not the app code. The bookings table has a [constraint](backend/src/migrations/001_init.sql) that says:

> Two **confirmed** bookings on the **same court** can't have **overlapping time ranges**.

```sql
EXCLUDE USING gist (court_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
  WHERE (status = 'confirmed')
```

- If two users submit the same slot at the same instant, Postgres accepts one insert and rejects the other. The API turns that rejection into `409 SLOT_TAKEN`.
- Cancelled bookings are ignored by the constraint, so a cancelled slot can be booked again.

**Tests:** one fires 10 simultaneous requests for the same slot and checks that exactly one wins; another inserts directly into the database (skipping the API) to prove the rule doesn't depend on app code.

## What I would do next with more time

- rate-limit the login endpoint
- decide what happens to future bookings when a court's hours shrink or it's deactivated (right now they're kept)
- test the days when clocks change (daylight saving)
- add pagination to "My bookings"
- one of the bonus options; real-time updates (SSE)
