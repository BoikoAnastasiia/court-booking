import type { Pool } from 'pg';
import { z } from 'zod';
import { config } from '../config';
import { getCourt } from '../courts/courts.service';
import { AppError, PG_EXCLUSION_VIOLATION, isPgError, notFound } from '../errors';
import { facilityHour, parseFacilityDate } from '../lib/time';

export const createBookingSchema = z.object({
  courtId: z.number().int().positive(),
  date: z.string(),
  startHour: z.number().int().min(0).max(23),
  durationHours: z.union([z.literal(1), z.literal(2)]),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export interface Booking {
  id: number;
  courtId: number;
  courtName: string;
  courtSport: string;
  userId: number;
  startsAt: Date;
  endsAt: Date;
  priceCents: number;
  status: 'confirmed' | 'cancelled';
  createdAt: Date;
  cancelledAt: Date | null;
}

const BOOKING_SELECT = `
  SELECT b.id, b.court_id AS "courtId", c.name AS "courtName", c.sport AS "courtSport", b.user_id AS "userId",
         b.starts_at AS "startsAt", b.ends_at AS "endsAt", b.price_cents AS "priceCents",
         b.status, b.created_at AS "createdAt", b.cancelled_at AS "cancelledAt"
    FROM bookings b
    JOIN courts c ON c.id = b.court_id`;

export async function createBooking(
  db: Pool,
  userId: number,
  input: CreateBookingInput,
  now: Date,
): Promise<Booking> {
  const day = parseFacilityDate(input.date);
  const endHour = input.startHour + input.durationHours;

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    // FOR SHARE: an admin can't deactivate the court or change its hours
    // between our checks and our insert.
    const court = await getCourt(client, input.courtId, { forShare: true });
    if (!court.isActive) {
      throw new AppError(422, 'COURT_INACTIVE', 'This court is not available for booking');
    }
    if (input.startHour < court.openHour || endHour > court.closeHour) {
      throw new AppError(
        422,
        'OUTSIDE_OPENING_HOURS',
        `${court.name} is open ${hh(court.openHour)}–${hh(court.closeHour)}`,
      );
    }
    const startsAt = facilityHour(day, input.startHour).toJSDate();
    const endsAt = facilityHour(day, endHour).toJSDate();
    if (startsAt <= now) {
      throw new AppError(422, 'BOOKING_IN_PAST', 'Cannot book a slot that has already started');
    }

    let id: number;
    try {
      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO bookings (court_id, user_id, starts_at, ends_at, price_cents)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [court.id, userId, startsAt, endsAt, court.hourlyPriceCents * input.durationHours],
      );
      id = rows[0]!.id;
    } catch (err) {
      // Raised by the bookings_no_overlap exclusion constraint. This is the
      // real double-booking guard; it also covers simultaneous requests.
      if (isPgError(err, PG_EXCLUSION_VIOLATION)) {
        throw new AppError(409, 'SLOT_TAKEN', 'That time slot is already booked');
      }
      throw err;
    }
    await client.query('COMMIT');
    return getBooking(db, id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getBooking(db: Pool, id: number): Promise<Booking> {
  const { rows } = await db.query<Booking>(`${BOOKING_SELECT} WHERE b.id = $1`, [id]);
  if (!rows[0]) throw notFound('Booking');
  return rows[0];
}

export function cancellationDeadline(startsAt: Date): Date {
  return new Date(startsAt.getTime() - config.cancellationWindowHours * 3_600_000);
}

/**
 * Cancels the user's own booking. Allowed until exactly
 * `cancellationWindowHours` before start; rejected afterwards.
 */
export async function cancelBooking(db: Pool, userId: number, bookingId: number, now: Date): Promise<Booking> {
  const { rows } = await db.query<Booking>(`${BOOKING_SELECT} WHERE b.id = $1 AND b.user_id = $2`, [
    bookingId,
    userId,
  ]);
  const booking = rows[0];
  // 404 (not 403) for other users' bookings, so ids can't be probed.
  if (!booking) throw notFound('Booking');
  if (booking.status === 'cancelled') {
    throw new AppError(409, 'ALREADY_CANCELLED', 'This booking is already cancelled');
  }
  if (now > cancellationDeadline(booking.startsAt)) {
    throw new AppError(
      422,
      'CANCELLATION_WINDOW_CLOSED',
      `Bookings can only be cancelled up to ${config.cancellationWindowHours} hours before they start`,
    );
  }
  // Guarded by status so two concurrent cancels can't both "succeed".
  const result = await db.query(
    `UPDATE bookings SET status = 'cancelled', cancelled_at = $2
      WHERE id = $1 AND status = 'confirmed'`,
    [bookingId, now],
  );
  if (result.rowCount === 0) {
    throw new AppError(409, 'ALREADY_CANCELLED', 'This booking is already cancelled');
  }
  return getBooking(db, bookingId);
}

export interface MyBooking extends Booking {
  canCancel: boolean;
}

/** All of a user's bookings, split around `now`. */
export async function listUserBookings(
  db: Pool,
  userId: number,
  now: Date,
): Promise<{ upcoming: MyBooking[]; past: MyBooking[] }> {
  const { rows } = await db.query<Booking>(
    `${BOOKING_SELECT} WHERE b.user_id = $1 ORDER BY b.starts_at`,
    [userId],
  );
  const withFlag = rows.map((b) => ({
    ...b,
    canCancel: b.status === 'confirmed' && now <= cancellationDeadline(b.startsAt),
  }));
  return {
    upcoming: withFlag.filter((b) => b.endsAt > now),
    past: withFlag.filter((b) => b.endsAt <= now).reverse(),
  };
}

function hh(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}
