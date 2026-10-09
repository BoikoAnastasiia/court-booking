import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useEffect, useState, type FormEvent } from 'react';
import type { CourtInput } from '../../api';
import { formatHour } from '../../format';

const HOURS = Array.from({ length: 25 }, (_, h) => h);
export const EMPTY_COURT: CourtInput = {
  name: '',
  sport: '',
  hourlyPriceCents: 2000,
  openHour: 8,
  closeHour: 22,
  isActive: true,
};

interface CourtDialogProps {
  /** Court being edited, EMPTY_COURT to create, null when closed. */
  initial: CourtInput | null;
  title: string;
  sports: string[];
  onSubmit: (input: CourtInput) => Promise<void>;
  onClose: () => void;
}

export function CourtDialog({ initial, title, sports, onSubmit, onClose }: CourtDialogProps) {
  const [form, setForm] = useState(EMPTY_COURT);
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm(initial);
      setPrice((initial.hourlyPriceCents / 100).toFixed(2));
      setError(null);
    }
  }, [initial]);

  const hoursInvalid = form.openHour >= form.closeHour;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (hoursInvalid) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ ...form, sport: form.sport.trim(), hourlyPriceCents: Math.round(Number(price) * 100) });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!initial} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <form onSubmit={submit}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
            />
            <Autocomplete
              freeSolo
              options={sports}
              inputValue={form.sport}
              onInputChange={(_e, value) => setForm({ ...form, sport: value })}
              renderInput={(params) => (
                <TextField {...params} label="Sport" required helperText="Pick an existing sport or type a new one" />
              )}
            />
            <TextField
              label="Price per hour"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              slotProps={{
                input: { startAdornment: <InputAdornment position="start">€</InputAdornment> },
                htmlInput: { min: 0, step: 0.5 },
              }}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                select
                fullWidth
                label="Opens"
                value={form.openHour}
                onChange={(e) => setForm({ ...form, openHour: Number(e.target.value) })}
              >
                {HOURS.slice(0, 24).map((h) => (
                  <MenuItem key={h} value={h}>
                    {formatHour(h)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                label="Closes"
                value={form.closeHour}
                onChange={(e) => setForm({ ...form, closeHour: Number(e.target.value) })}
                error={hoursInvalid}
                helperText={hoursInvalid ? 'Must be after opening' : ' '}
              >
                {HOURS.slice(1).map((h) => (
                  <MenuItem key={h} value={h}>
                    {formatHour(h)}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={busy} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={busy} disabled={hoursInvalid}>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
