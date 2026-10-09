import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { sportsByCourtCount } from '../booking-options';
import { Hero } from '../components/Hero';
import { Page } from '../components/Page';
import { nextDays, todayIn } from '../format';
import type { Court, CourtAvailability, DayAvailability } from '../types';
import { BookingDialog } from './book/BookingDialog';
import { CourtSlotsCard } from './book/CourtSlotsCard';
import { DateStrip } from './book/DateStrip';

// How far ahead the date picker goes. A UX choice, not a server rule:
// the API accepts any future date.
const BOOKING_HORIZON_DAYS = 90;

export function BookPage() {
  const { config } = useAuth();
  const today = todayIn(config.facilityTimezone);
  const dates = useMemo(() => nextDays(today, BOOKING_HORIZON_DAYS), [today]);

  // Sport and date live in the URL so the view survives refresh and can be shared.
  const [params, setParams] = useSearchParams();
  const [courts, setCourts] = useState<Court[] | null>(null);
  const sports = useMemo(() => sportsByCourtCount(courts ?? []), [courts]);
  const sport = params.get('sport') ?? sports[0] ?? '';
  const date = dates.includes(params.get('date') ?? '') ? params.get('date')! : today;

  const [day, setDay] = useState<DayAvailability | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ availability: CourtAvailability; startHour: number } | null>(null);

  function update(next: { sport?: string; date?: string }) {
    setParams({ sport: next.sport ?? sport, date: next.date ?? date }, { replace: true });
  }

  useEffect(() => {
    api
      .courts()
      .then(setCourts)
      .catch((err: Error) => setError(err.message));
  }, []);

  const load = useCallback(async () => {
    if (!sport) return;
    setLoading(true);
    try {
      setDay(await api.dayAvailability(date, sport));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [date, sport]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <Hero
        title="Book a court"
        subtitle={`Pick a sport, a day and a free slot. Times are in ${config.facilityTimezone.replace('_', ' ')}.`}
      />
      <Page>

      {/* Wrap rather than scroll, so every sport (and the selected one) stays visible. */}
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        {courts === null
          ? [1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" width={110} height={36} />)
          : sports.map((s) => (
              <Chip
                key={s}
                label={s}
                clickable
                onClick={() => update({ sport: s })}
                color={s === sport ? 'primary' : 'default'}
                variant={s === sport ? 'filled' : 'outlined'}
                sx={{ fontWeight: 600, px: 1, height: 36, borderRadius: 2 }}
              />
            ))}
      </Stack>

      <DateStrip dates={dates} value={date} onChange={(d) => update({ date: d })} />

      {error && <Alert severity="error">{error}</Alert>}
      {courts?.length === 0 && <Alert severity="info">No courts are available right now.</Alert>}

      <Stack spacing={2} sx={{ opacity: loading && day ? 0.6 : 1, transition: 'opacity 150ms' }}>
        {!day && loading
          ? [1, 2].map((i) => <Skeleton key={i} variant="rounded" height={180} />)
          : day?.courts.map((availability) => (
              <CourtSlotsCard
                key={availability.court.id}
                availability={availability}
                onPick={(slot) => setSelection({ availability, startHour: slot.startHour })}
              />
            ))}
      </Stack>

      <BookingDialog selection={selection} date={date} onClose={() => setSelection(null)} onChanged={load} />
      </Page>
    </>
  );
}
