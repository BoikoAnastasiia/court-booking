import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { sportsByCourtCount } from '../booking-options';
import { Hero } from '../components/Hero';
import { LiveBadge } from '../components/LiveBadge';
import { Page } from '../components/Page';
import { formatDate, nextDays, todayIn } from '../format';
import { useRealtime } from '../realtime';
import { useToast } from '../toast';
import type { Court, CourtAvailability, DayAvailability } from '../types';
import { BookingDialog } from './book/BookingDialog';
import { CourtSlotsCard } from './book/CourtSlotsCard';
import { DateStrip } from './book/DateStrip';

// How far ahead the date picker goes. A UX choice, not a server rule:
// the API accepts any future date.
const BOOKING_HORIZON_DAYS = 90;

export function BookPage() {
  const { config } = useAuth();
  const toast = useToast();
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

  const loadCourts = useCallback(() => {
    api
      .courts()
      .then(setCourts)
      .catch((err: Error) => setError(err.message));
  }, []);
  useEffect(loadCourts, [loadCourts]);

  // Only the latest request may update the view: a slow response for a date
  // the user already left (or an older realtime refresh) is discarded.
  const latestRequest = useRef(0);
  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!sport) return;
      const requestId = ++latestRequest.current;
      if (!silent) setLoading(true);
      try {
        const result = await api.dayAvailability(date, sport);
        if (requestId !== latestRequest.current) return;
        setDay(result);
        setError(null);
      } catch (err) {
        if (requestId === latestRequest.current) setError((err as Error).message);
      } finally {
        if (requestId === latestRequest.current) setLoading(false);
      }
    },
    [date, sport],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Someone else booked or cancelled: refresh quietly if it affects this view.
  const realtimeStatus = useRealtime((event) => {
    if (event.type === 'courts.changed') {
      loadCourts();
      void load({ silent: true });
    } else if (event.type === 'resync') {
      void load({ silent: true });
    } else if (event.date === date && day?.courts.some((c) => c.court.id === event.courtId)) {
      void load({ silent: true });
    }
  });

  // Keep an open booking dialog in sync with fresh availability; close it if
  // the slot was just taken by someone else.
  useEffect(() => {
    if (!day || !selection) return;
    const fresh = day.courts.find((c) => c.court.id === selection.availability.court.id);
    const slot = fresh?.slots.find((s) => s.startHour === selection.startHour);
    if (!fresh || slot?.status !== 'available') {
      setSelection(null);
      toast('Someone just booked this slot. Please pick another one.', 'warning');
    } else if (fresh !== selection.availability) {
      setSelection({ ...selection, availability: fresh });
    }
  }, [day, selection, toast]);

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

        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Typography variant="subtitle1" fontWeight={600}>
            {formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}
          </Typography>
          <LiveBadge status={realtimeStatus} />
        </Stack>

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

        <BookingDialog
          selection={selection}
          date={date}
          onClose={() => setSelection(null)}
          onChanged={() => void load({ silent: true })}
        />
      </Page>
    </>
  );
}
