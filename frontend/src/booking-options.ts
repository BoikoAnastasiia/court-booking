import type { Slot } from './types';

/**
 * Durations (in hours) that can be booked starting at `startHour`.
 * 2 hours is only offered when the following slot is free too.
 * This is a UX hint only: the server re-validates every rule.
 */
export function availableDurations(slots: Slot[], startHour: number): (1 | 2)[] {
  const first = slots.find((s) => s.startHour === startHour);
  if (!first || first.status !== 'available') return [];
  const second = slots.find((s) => s.startHour === startHour + 1);
  return second?.status === 'available' ? [1, 2] : [1];
}
