import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useEffect, useState, type ReactNode } from 'react';
import { ApiError, api } from '../../api';
import { useAuth } from '../../auth';
import { availableDurations } from '../../booking-options';
import { formatDate, formatHour, formatPrice } from '../../format';
import { useToast } from '../../toast';
import type { CourtAvailability } from '../../types';

interface BookingDialogProps {
  /** Court + start hour the user clicked; null when closed. */
  selection: { availability: CourtAvailability; startHour: number } | null;
  date: string;
  onClose: () => void;
  /** Called after a booking attempt that changed availability (success or conflict). */
  onChanged: () => void;
}

export function BookingDialog({ selection, date, onClose, onChanged }: BookingDialogProps) {
  const { config } = useAuth();
  const toast = useToast();
  const [duration, setDuration] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset only when a different slot is picked, not when the same selection
  // is refreshed with new availability from a realtime update.
  const slotKey = selection && `${selection.availability.court.id}@${selection.startHour}`;
  useEffect(() => {
    setDuration(1);
    setError(null);
  }, [slotKey]);

  // Keep the last selection rendered while the dialog animates closed.
  const [shown, setShown] = useState(selection);
  useEffect(() => {
    if (selection) setShown(selection);
  }, [selection]);
  if (!shown) return null;

  const { court, slots } = shown.availability;
  const { startHour } = shown;
  const durations = availableDurations(slots, startHour);
  // If the second hour was taken meanwhile, fall back to 1 hour.
  const hours: 1 | 2 = durations.includes(duration) ? duration : 1;
  const endHour = startHour + hours;
  const time = `${formatHour(startHour)}–${formatHour(endHour)}`;

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await api.createBooking({ courtId: court.id, date, startHour, durationHours: hours });
      toast(`Booked! ${court.name}, ${formatDate(date, { weekday: 'short', day: 'numeric', month: 'short' })} ${time}`);
      onChanged();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SLOT_TAKEN') {
        toast('Someone just booked that slot. Availability has been refreshed.', 'warning');
        onChanged();
        onClose();
      } else {
        setError((err as Error).message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!selection} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Confirm booking</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Duration
            </Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              color="primary"
              value={hours}
              onChange={(_e, value: 1 | 2 | null) => value && setDuration(value)}
            >
              <ToggleButton value={1}>1 hour</ToggleButton>
              <ToggleButton value={2} disabled={!durations.includes(2)}>
                2 hours
              </ToggleButton>
            </ToggleButtonGroup>
            {!durations.includes(2) && (
              <Typography variant="caption" color="text.secondary">
                2 hours isn't possible: the next hour is taken or the court closes.
              </Typography>
            )}
          </Stack>
          <Divider />
          <Summary label="Court" value={`${court.name} · ${court.sport}`} />
          <Summary label="Date" value={formatDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
          <Summary label="Time" value={time} />
          <Summary label="Total" value={<strong>{formatPrice(court.hourlyPriceCents * hours)}</strong>} />
          <Alert severity="info" variant="outlined">
            Free cancellation up to {config.cancellationWindowHours} hours before start.
          </Alert>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy} color="inherit">
          Back
        </Button>
        <Button variant="contained" onClick={confirm} loading={busy}>
          Confirm booking
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Summary({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography color="text.secondary">{label}</Typography>
      <Typography textAlign="right">{value}</Typography>
    </Stack>
  );
}
