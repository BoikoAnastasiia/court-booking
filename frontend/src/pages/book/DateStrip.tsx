import ButtonBase from '@mui/material/ButtonBase';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { formatDate } from '../../format';

interface DateStripProps {
  dates: string[];
  value: string;
  onChange: (date: string) => void;
}

/** Horizontally scrollable day picker, e.g. "Fri / 09 / Oct". */
export function DateStrip({ dates, value, onChange }: DateStripProps) {
  return (
    <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1, scrollbarWidth: 'thin' }}>
      {dates.map((date) => {
        const selected = date === value;
        return (
          <ButtonBase
            key={date}
            onClick={() => onChange(date)}
            aria-pressed={selected}
            sx={{
              flexDirection: 'column',
              minWidth: 64,
              py: 1,
              borderRadius: 2,
              border: 1,
              borderColor: selected ? 'text.primary' : 'divider',
              bgcolor: selected ? 'text.primary' : 'background.paper',
              color: selected ? 'background.paper' : 'text.primary',
              transition: 'background-color 120ms',
              '&:hover': { borderColor: 'text.primary' },
            }}
          >
            <Typography variant="caption" sx={{ opacity: 0.75 }}>
              {formatDate(date, { weekday: 'short' })}
            </Typography>
            <Typography variant="h6" lineHeight={1.2}>
              {formatDate(date, { day: '2-digit' })}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.75 }}>
              {formatDate(date, { month: 'short' })}
            </Typography>
          </ButtonBase>
        );
      })}
    </Stack>
  );
}
