import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import { AppError, PG_UNIQUE_VIOLATION, isPgError, notFound } from '../errors';
import { facilityHour, parseFacilityDate } from '../lib/time';

export interface Court {
  id: number;
  name: string;
  sport: string;
  hourlyPriceCents: number;
  openHour: number;
  closeHour: number;
  isActive: boolean;
}

const COURT_COLUMNS = `
  id, name, sport,
  hourly_price_cents AS "hourlyPriceCents",
  open_hour AS "openHour",
  close_hour AS "closeHour",
  is_active AS "isActive"`;

const courtFields = {
  name: z.string().trim().min(1).max(100),
  sport: z.string().trim().min(1).max(50),
  hourlyPriceCents: z.number().int().min(0).max(1_000_000),
  openHour: z.number().int().min(0).max(23),
  closeHour: z.number().int().min(1).max(24),
  isActive: z.boolean(),
};

const openBeforeClose = (c: { openHour?: number; closeHour?: number }) =>
  c.openHour === undefined || c.closeHour === undefined || c.openHour < c.closeHour;
const openBeforeCloseMsg = { message: 'openHour must be before closeHour', path: ['closeHour'] };

export const createCourtSchema = z
  .object({ ...courtFields, isActive: courtFields.isActive.default(true) })
  .refine(openBeforeClose, openBeforeCloseMsg);

export const updateCourtSchema = z
  .object(courtFields)
  .partial()
  .refine((c) => Object.keys(c).length > 0, { message: 'Provide at least one field' })
  .refine(openBeforeClose, openBeforeCloseMsg);

export type CreateCourtInput = z.infer<typeof createCourtSchema>;
export type UpdateCourtInput = z.infer<typeof updateCourtSchema>;

type Queryable = Pool | PoolClient;

export async function listCourts(db: Queryable, opts: { includeInactive: boolean }): Promise<Court[]> {
  const { rows } = await db.query<Court>(
    `SELECT ${COURT_COLUMNS} FROM courts
      WHERE $1::boolean OR is_active
      ORDER BY is_active DESC, name`,
    [opts.includeInactive],
  );
  return rows;
}

export async function getCourt(db: Queryable, id: number, opts: { lock?: boolean } = {}): Promise<Court> {
  const { rows } = await db.query<Court>(
    `SELECT ${COURT_COLUMNS} FROM courts WHERE id = $1 ${opts.lock ? 'FOR NO KEY UPDATE' : ''}`,
    [id],
  );
  if (!rows[0]) throw notFound('Court');
  return rows[0];
}

function rethrowDuplicateName(err: unknown): never {
  if (isPgError(err, PG_UNIQUE_VIOLATION)) {
    throw new AppError(409, 'COURT_NAME_TAKEN', 'A court with this name already exists');
  }
  throw err;
}

export async function createCourt(db: Pool, input: CreateCourtInput): Promise<Court> {
  try {
    const { rows } = await db.query<Court>(
      `INSERT INTO courts (name, sport, hourly_price_cents, open_hour, close_hour, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${COURT_COLUMNS}`,
      [input.name, input.sport, input.hourlyPriceCents, input.openHour, input.closeHour, input.isActive],
    );
    return rows[0]!;
  } catch (err) {
    rethrowDuplicateName(err);
  }
}

/**
 * Partial update. Deactivation is just `isActive: false` — the court row
 * stays, so its booking history (FK ON DELETE RESTRICT) is preserved.
 */
export async function updateCourt(db: Pool, id: number, input: UpdateCourtInput): Promise<Court> {
  const current = await getCourt(db, id);
  const next = { ...current, ...input };
  if (next.openHour >= next.closeHour) {
    throw new AppError(400, 'VALIDATION_ERROR', 'openHour must be before closeHour');
  }
  try {
    const { rows } = await db.query<Court>(
      `UPDATE courts
          SET name = $2, sport = $3, hourly_price_cents = $4,
              open_hour = $5, close_hour = $6, is_active = $7, updated_at = now()
        WHERE id = $1
        RETURNING ${COURT_COLUMNS}`,
      [id, next.name, next.sport, next.hourlyPriceCents, next.openHour, next.closeHour, next.isActive],
    );
    return rows[0]!;
  } catch (err) {
    rethrowDuplicateName(err);
  }
}

export type SlotStatus = 'available' | 'booked' | 'mine' | 'past';

export interface Slot {
  startHour: number;
  startsAt: string;
  endsAt: string;
  status: SlotStatus;
}

export interface CourtAvailability {
  court: Court;
  slots: Slot[];
}

/**
 * One-hour slots for each court on a facility-local date, from open_hour to
 * close_hour. A slot is unavailable if it overlaps a confirmed booking or
 * has already started. Uses a single bookings query for all courts.
 */
async function buildAvailability(
  db: Pool,
  courts: Court[],
  date: string,
  viewerId: number,
  now: Date,
): Promise<CourtAvailability[]> {
  const day = parseFacilityDate(date);
  if (courts.length === 0) return [];

  const { rows: bookings } = await db.query<{ courtId: number; startsAt: Date; endsAt: Date; userId: number }>(
    `SELECT court_id AS "courtId", starts_at AS "startsAt", ends_at AS "endsAt", user_id AS "userId"
       FROM bookings
      WHERE court_id = ANY($1) AND status = 'confirmed'
        AND tstzrange(starts_at, ends_at, '[)') && tstzrange($2, $3, '[)')`,
    [courts.map((c) => c.id), facilityHour(day, 0).toJSDate(), facilityHour(day, 24).toJSDate()],
  );

  return courts.map((court) => {
    const courtBookings = bookings.filter((b) => b.courtId === court.id);
    const slots: Slot[] = [];
    for (let hour = court.openHour; hour < court.closeHour; hour++) {
      const start = facilityHour(day, hour).toJSDate();
      const end = facilityHour(day, hour + 1).toJSDate();
      const overlapping = courtBookings.find((b) => b.startsAt < end && b.endsAt > start);
      let status: SlotStatus = 'available';
      if (overlapping) status = overlapping.userId === viewerId ? 'mine' : 'booked';
      else if (start <= now) status = 'past';
      slots.push({ startHour: hour, startsAt: start.toISOString(), endsAt: end.toISOString(), status });
    }
    return { court, slots };
  });
}

export async function getAvailability(
  db: Pool,
  courtId: number,
  date: string,
  viewerId: number,
  now: Date,
): Promise<{ court: Court; date: string; slots: Slot[] }> {
  parseFacilityDate(date); // validate before hitting the DB
  const court = await getCourt(db, courtId);
  if (!court.isActive) {
    throw new AppError(422, 'COURT_INACTIVE', 'This court is not available for booking');
  }
  const [result] = await buildAvailability(db, [court], date, viewerId, now);
  return { court, date, slots: result!.slots };
}

/** Availability of every active court (optionally of one sport) on a date. */
export async function getDayAvailability(
  db: Pool,
  date: string,
  sport: string | undefined,
  viewerId: number,
  now: Date,
): Promise<{ date: string; courts: CourtAvailability[] }> {
  parseFacilityDate(date);
  const courts = (await listCourts(db, { includeInactive: false })).filter((c) => !sport || c.sport === sport);
  return { date, courts: await buildAvailability(db, courts, date, viewerId, now) };
}
