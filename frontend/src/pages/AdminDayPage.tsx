import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { createColumnHelper } from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { DataTable } from '../components/DataTable';
import { StatusChip } from '../components/StatusChip';
import { UserAvatar } from '../components/UserAvatar';
import { addDays, formatDate, formatPrice, formatTime, todayIn } from '../format';
import type { AdminBooking, AdminDay } from '../types';

const column = createColumnHelper<AdminBooking>();

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card sx={{ flex: 1, minWidth: 160 }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4">{value}</Typography>
      </CardContent>
    </Card>
  );
}

export function AdminDayPage() {
  const { config } = useAuth();
  const tz = config.facilityTimezone;
  const today = todayIn(tz);
  const [date, setDate] = useState(today);
  const [day, setDay] = useState<AdminDay | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date) return;
    setError(null);
    api
      .adminDay(date)
      .then(setDay)
      .catch((err: Error) => setError(err.message));
  }, [date]);

  const columns = useMemo(
    () => [
      column.accessor((b) => new Date(b.startsAt), {
        id: 'time',
        header: 'Time',
        sortingFn: 'datetime',
        cell: ({ row }) => `${formatTime(row.original.startsAt, tz)}–${formatTime(row.original.endsAt, tz)}`,
      }),
      column.accessor('courtName', {
        header: 'Court',
        cell: ({ row }) => (
          <>
            <Typography variant="body2" fontWeight={500}>
              {row.original.courtName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.original.courtSport}
            </Typography>
          </>
        ),
      }),
      column.accessor('userName', {
        header: 'Customer',
        cell: ({ row }) => (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <UserAvatar name={row.original.userName} src={row.original.userAvatarUrl} size={32} />
            <Box>
              <Typography variant="body2">{row.original.userName}</Typography>
              <Typography variant="caption" color="text.secondary">
                {row.original.userEmail}
              </Typography>
            </Box>
          </Stack>
        ),
      }),
      column.accessor('priceCents', {
        header: 'Price',
        meta: { align: 'right' },
        cell: (info) => formatPrice(info.getValue()),
      }),
      column.accessor('status', { header: 'Status', cell: (info) => <StatusChip status={info.getValue()} /> }),
    ],
    [tz],
  );

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">Day overview</Typography>
        <Typography color="text.secondary">
          {date && formatDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} alignItems="center">
        <IconButton aria-label="Previous day" disabled={!date} onClick={() => setDate((d) => addDays(d, -1))}>
          <ChevronLeftIcon />
        </IconButton>
        <TextField type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <IconButton aria-label="Next day" disabled={!date} onClick={() => setDate((d) => addDays(d, 1))}>
          <ChevronRightIcon />
        </IconButton>
        <Button onClick={() => setDate(today)} disabled={date === today}>
          Today
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {day && (
        <>
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
            <Stat label="Expected revenue" value={formatPrice(day.totalRevenueCents)} />
            <Stat label="Confirmed bookings" value={day.confirmedCount} />
            <Stat label="Cancelled" value={day.bookings.length - day.confirmedCount} />
          </Stack>
          <DataTable
            data={day.bookings}
            columns={columns}
            getRowId={(b) => String(b.id)}
            initialSorting={[{ id: 'time', desc: false }]}
            isRowMuted={(b) => b.status === 'cancelled'}
            emptyText="No bookings on this day."
          />
          <Typography variant="body2" color="text.secondary">
            Revenue counts confirmed bookings only, at the price paid when booked.
          </Typography>
        </>
      )}
    </Stack>
  );
}
