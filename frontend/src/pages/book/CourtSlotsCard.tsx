import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { formatHour, formatPrice } from '../../format';
import type { CourtAvailability, Slot } from '../../types';

interface CourtSlotsCardProps {
  availability: CourtAvailability;
  onPick: (slot: Slot) => void;
}

export function CourtSlotsCard({ availability: { court, slots }, onPick }: CourtSlotsCardProps) {
  const freeCount = slots.filter((s) => s.status === 'available').length;
  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              {court.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Open {formatHour(court.openHour)}–{formatHour(court.closeHour)} · {freeCount} free
            </Typography>
          </Box>
          <Chip label={`${formatPrice(court.hourlyPriceCents)} / h`} variant="outlined" />
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(124px, 1fr))', gap: 1 }}>
          {slots.map((slot) => (
            <SlotButton key={slot.startHour} slot={slot} onPick={() => onPick(slot)} />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

function SlotButton({ slot, onPick }: { slot: Slot; onPick: () => void }) {
  const label = `${formatHour(slot.startHour)} – ${formatHour(slot.startHour + 1)}`;
  if (slot.status === 'mine') {
    return (
      <Button variant="contained" color="info" disableRipple sx={{ pointerEvents: 'none', flexDirection: 'column', py: 0.5 }}>
        {label}
        <Typography variant="caption" lineHeight={1}>
          Your booking
        </Typography>
      </Button>
    );
  }
  const available = slot.status === 'available';
  return (
    <Button
      variant="outlined"
      color="inherit"
      disabled={!available}
      onClick={onPick}
      aria-label={`${label} ${available ? 'available' : slot.status}`}
      sx={{
        position: 'relative',
        borderColor: 'divider',
        py: 1.25,
        '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
      }}
    >
      {label}
      {available && (
        <Box
          component="span"
          sx={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', bgcolor: 'success.main' }}
        />
      )}
    </Button>
  );
}
