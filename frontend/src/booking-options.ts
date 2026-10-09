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

/** Distinct sports, the ones with most courts first (ties alphabetical). */
export function sportsByCourtCount(courts: { sport: string }[]): string[] {
  const counts = new Map<string, number>();
  for (const c of courts) counts.set(c.sport, (counts.get(c.sport) ?? 0) + 1);
  return [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)! || a.localeCompare(b));
}
