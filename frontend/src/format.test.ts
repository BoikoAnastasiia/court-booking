import { addDays, dateIn, formatDate, nextDays } from './format';

describe('date helpers', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('is not affected by DST changes', () => {
    // Europe switches to winter time on 2026-10-25.
    expect(nextDays('2026-10-24', 3)).toEqual(['2026-10-24', '2026-10-25', '2026-10-26']);
  });

  it('formats a calendar date without shifting it to another day', () => {
    expect(formatDate('2026-10-09', { weekday: 'short', day: '2-digit', month: 'short' })).toBe('Fri 09 Oct');
  });

  it('reads the facility-local date of an instant', () => {
    // 23:30 UTC is already the next day in Madrid (UTC+2 in summer).
    expect(dateIn('2026-07-01T23:30:00Z', 'Europe/Madrid')).toBe('2026-07-02');
  });
});
