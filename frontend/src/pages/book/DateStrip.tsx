import CalendarMonthIcon from '@mui/icons-material/CalendarMonthOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import dayjs from 'dayjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { formatDate } from '../../format';

// Shared look of the day tiles and the calendar button.
const tileSx = {
  flexDirection: 'column',
  flexShrink: 0,
  minWidth: 64,
  py: 1,
  borderRadius: 2,
  border: 1,
  borderColor: 'divider',
  bgcolor: 'background.paper',
} as const;

// On phones the strip is swiped, so the arrows only take up space.
const arrowSx = { display: { xs: 'none', sm: 'inline-flex' } } as const;

interface DateStripProps {
  /** Bookable dates (YYYY-MM-DD), first = today. */
  dates: string[];
  value: string;
  onChange: (date: string) => void;
}

/**
 * Scrollable day picker ("Fri / 09 / Oct") with arrows, plus a calendar
 * popover for jumping further ahead. Both cover the same range of dates.
 */
export function DateStrip({ dates, value, onChange }: DateStripProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });
  const [calendarAnchor, setCalendarAnchor] = useState<HTMLElement | null>(null);
  const firstScroll = useRef(true);

  const updateArrows = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setCanScroll({ left: el.scrollLeft > 0, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 });
  }, []);

  useEffect(() => {
    updateArrows();
    window.addEventListener('resize', updateArrows);
    return () => window.removeEventListener('resize', updateArrows);
  }, [updateArrows]);

  // Keep the selected day visible, e.g. after picking it in the calendar.
  useEffect(() => {
    const day = scroller.current?.querySelector<HTMLElement>(`[data-date="${value}"]`);
    day?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: firstScroll.current ? 'auto' : 'smooth' });
    firstScroll.current = false;
  }, [value]);

  function page(direction: 1 | -1) {
    const el = scroller.current;
    el?.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <ButtonBase
        onClick={(e) => setCalendarAnchor(e.currentTarget)}
        aria-label="Open calendar"
        sx={{ ...tileSx, alignSelf: 'stretch', gap: 0.5, '&:hover': { borderColor: 'text.primary' } }}
      >
        <CalendarMonthIcon fontSize="small" />
        <Typography variant="caption" lineHeight={1.2} textAlign="center">
          {formatDate(value, { month: 'short' })}
          <br />
          {formatDate(value, { year: 'numeric' })}
        </Typography>
      </ButtonBase>

      <IconButton
        aria-label="Earlier dates"
        onClick={() => page(-1)}
        disabled={!canScroll.left}
        size="small"
        sx={arrowSx}
      >
        <ChevronLeftIcon />
      </IconButton>

      <Box
        ref={scroller}
        onScroll={updateArrows}
        sx={{
          display: 'flex',
          gap: 1,
          overflowX: 'auto',
          flex: 1,
          py: 0.5,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {dates.map((date) => {
          const selected = date === value;
          return (
            <ButtonBase
              key={date}
              data-date={date}
              onClick={() => onChange(date)}
              aria-pressed={selected}
              aria-label={formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}
              sx={{
                ...tileSx,
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
      </Box>

      <IconButton
        aria-label="Later dates"
        onClick={() => page(1)}
        disabled={!canScroll.right}
        size="small"
        sx={arrowSx}
      >
        <ChevronRightIcon />
      </IconButton>

      <Popover
        open={!!calendarAnchor}
        anchorEl={calendarAnchor}
        onClose={() => setCalendarAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <DateCalendar
          value={dayjs(value)}
          minDate={dayjs(dates[0])}
          maxDate={dayjs(dates[dates.length - 1])}
          onChange={(day) => {
            if (!day) return;
            onChange(day.format('YYYY-MM-DD'));
            setCalendarAnchor(null);
          }}
        />
      </Popover>
    </Stack>
  );
}
