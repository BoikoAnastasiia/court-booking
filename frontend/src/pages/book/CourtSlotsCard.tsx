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
        {/* Phones: 4 compact columns so a whole court fits on screen. */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(4, 1fr)', sm: 'repeat(auto-fill, minmax(124px, 1fr))' },
            gap: { xs: 0.75, sm: 1 },
          }}
        >
          {slots.map((slot) => (
            <SlotButton key={slot.startHour} slot={slot} onPick={() => onPick(slot)} />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

// On phones a slot shows only its start time; the end time is implied (1 hour).
const desktopOnly = { display: { xs: 'none', sm: 'inline' } } as const;
const phoneOnly = { display: { xs: 'inline', sm: 'none' } } as const;

function SlotButton({ slot, onPick }: { slot: Slot; onPick: () => void }) {
  const label = `${formatHour(slot.startHour)} – ${formatHour(slot.startHour + 1)}`;
  // One element, so the column-stacked "mine" button keeps the time on one line.
  const text = (
    <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
      {formatHour(slot.startHour)}
      <Box component="span" sx={desktopOnly}>
        &nbsp;– {formatHour(slot.startHour + 1)}
      </Box>
    </Box>
  );
  const compact = { minWidth: 0, px: { xs: 0.5, sm: 2 }, fontSize: { xs: '0.8125rem', sm: '0.875rem' } };

  if (slot.status === 'mine') {
    return (
      <Button
        variant="contained"
        color="info"
        disableRipple
        aria-label={`${label} your booking`}
        sx={{ ...compact, pointerEvents: 'none', flexDirection: 'column', py: 0.5 }}
      >
        {text}
        <Typography variant="caption" lineHeight={1}>
          <Box component="span" sx={desktopOnly}>
            Your booking
          </Box>
          <Box component="span" sx={phoneOnly}>
            Yours
          </Box>
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
        ...compact,
        position: 'relative',
        borderColor: 'divider',
        py: { xs: 1, sm: 1.25 },
        '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
      }}
    >
      {text}
      {available && (
        <Box
          component="span"
          sx={{
            position: 'absolute',
            top: { xs: 4, sm: 6 },
            right: { xs: 4, sm: 6 },
            width: 7,
            height: 7,
            borderRadius: '50%',
            bgcolor: 'success.main',
          }}
        />
      )}
    </Button>
  );
}
