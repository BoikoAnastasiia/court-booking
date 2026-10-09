import { availableDurations, sportsByCourtCount } from './booking-options';
import type { Slot, SlotStatus } from './types';

const slots = (statuses: SlotStatus[]): Slot[] =>
  statuses.map((status, i) => ({ startHour: 8 + i, startsAt: '', endsAt: '', status }));

describe('availableDurations', () => {
  it('offers 1h and 2h when the next slot is free', () => {
    expect(availableDurations(slots(['available', 'available']), 8)).toEqual([1, 2]);
  });
  it('offers only 1h when the next slot is taken', () => {
    expect(availableDurations(slots(['available', 'booked']), 8)).toEqual([1]);
  });
  it('offers only 1h for the last slot before closing', () => {
    expect(availableDurations(slots(['available', 'available']), 9)).toEqual([1]);
  });
  it('offers nothing for a slot that is not free', () => {
    expect(availableDurations(slots(['past', 'available']), 8)).toEqual([]);
    expect(availableDurations(slots(['mine', 'available']), 8)).toEqual([]);
  });
});

describe('sportsByCourtCount', () => {
  it('orders sports by number of courts, then alphabetically', () => {
    const courts = ['Squash', 'Padel', 'Tennis', 'Padel', 'Badminton', 'Tennis', 'Padel'].map((sport) => ({ sport }));
    expect(sportsByCourtCount(courts)).toEqual(['Padel', 'Tennis', 'Badminton', 'Squash']);
  });
});
