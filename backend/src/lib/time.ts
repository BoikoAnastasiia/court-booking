import { DateTime } from 'luxon';
import { config } from '../config';
import { AppError } from '../errors';

export type Clock = () => Date;
export const systemClock: Clock = () => new Date();

/** Parses YYYY-MM-DD as the start of that calendar day in the facility timezone. */
export function parseFacilityDate(date: string): DateTime {
  const day = DateTime.fromISO(date, { zone: config.facilityTimezone });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !day.isValid) {
    throw new AppError(400, 'INVALID_DATE', 'date must be a valid YYYY-MM-DD');
  }
  return day.startOf('day');
}

/**
 * Wall-clock hour on a facility day as an absolute instant.
 * hour 24 is midnight of the next day (used for close_hour = 24).
 */
export function facilityHour(day: DateTime, hour: number): DateTime {
  return hour === 24 ? day.plus({ days: 1 }).startOf('day') : day.set({ hour });
}

/** [start, end) of a facility calendar day as absolute instants. */
export function facilityDayBounds(day: DateTime): { start: Date; end: Date } {
  return { start: day.toJSDate(), end: day.plus({ days: 1 }).startOf('day').toJSDate() };
}

export function todayInFacility(now: Date): string {
  return DateTime.fromJSDate(now, { zone: config.facilityTimezone }).toISODate()!;
}
