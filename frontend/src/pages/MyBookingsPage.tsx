import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { createColumnHelper } from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DataTable } from '../components/DataTable';
import { StatusChip } from '../components/StatusChip';
import { dateIn, formatDate, formatDateTime, formatPrice, formatTime } from '../format';
import { useToast } from '../toast';
import type { MyBooking } from '../types';

type TabKey = 'upcoming' | 'past';
const column = createColumnHelper<MyBooking>();

export function MyBookingsPage() {
  const { config } = useAuth();
  const tz = config.facilityTimezone;
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab: TabKey = params.get('tab') === 'past' ? 'past' : 'upcoming';
  const [data, setData] = useState<{ upcoming: MyBooking[]; past: MyBooking[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toCancel, setToCancel] = useState<MyBooking | null>(null);

  const load = useCallback(() => {
    api
      .myBookings()
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);
  useEffect(load, [load]);

  const columns = useMemo(
    () => [
      column.accessor((b) => new Date(b.startsAt), {
        id: 'date',
        header: 'Date',
        sortingFn: 'datetime',
        cell: (info) => formatDate(dateIn(info.row.original.startsAt, tz), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
      }),
      column.display({
        id: 'time',
        header: 'Time',
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
      column.accessor('priceCents', {
        header: 'Price',
        meta: { align: 'right' },
        cell: (info) => formatPrice(info.getValue()),
      }),
      column.accessor('status', { header: 'Status', cell: (info) => <StatusChip status={info.getValue()} /> }),
      ...(tab === 'upcoming'
        ? [
            column.display({
              id: 'actions',
              header: '',
              meta: { align: 'right' },
              cell: ({ row }) => {
                const b = row.original;
                if (b.status !== 'confirmed') return null;
                return b.canCancel ? (
                  <Button size="small" color="error" variant="outlined" onClick={() => setToCancel(b)}>
                    Cancel
                  </Button>
                ) : (
                  <Tooltip title={`Cancellation closes ${config.cancellationWindowHours}h before the start`}>
                    <Typography variant="caption" color="text.secondary">
                      Too late to cancel
                    </Typography>
                  </Tooltip>
                );
              },
            }),
          ]
        : []),
    ],
    [tab, tz, config.cancellationWindowHours],
  );

  async function cancel() {
    if (!toCancel) return;
    try {
      await api.cancelBooking(toCancel.id);
      toast('Booking cancelled');
    } catch (err) {
      toast((err as Error).message, 'error');
    }
    setToCancel(null);
    load();
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">My bookings</Typography>
        <Typography color="text.secondary">
          Bookings can be cancelled up to {config.cancellationWindowHours} hours before they start.
        </Typography>
      </Box>
      {error && <Alert severity="error">{error}</Alert>}

      <Tabs value={tab} onChange={(_e, value: TabKey) => setParams(value === 'upcoming' ? {} : { tab: value })}>
        <Tab value="upcoming" label={`Upcoming${data ? ` (${data.upcoming.length})` : ''}`} />
        <Tab value="past" label={`Past${data ? ` (${data.past.length})` : ''}`} />
      </Tabs>

      {!data ? (
        <Skeleton variant="rounded" height={240} />
      ) : (
        <DataTable
          // Remount per tab so each tab starts with its own default sort.
          key={tab}
          data={data[tab]}
          columns={columns}
          getRowId={(b) => String(b.id)}
          initialSorting={[{ id: 'date', desc: tab === 'past' }]}
          isRowMuted={(b) => b.status === 'cancelled'}
          emptyText={tab === 'upcoming' ? 'No upcoming bookings. Time to book a court!' : 'No past bookings yet.'}
        />
      )}

      <ConfirmDialog
        open={!!toCancel}
        title="Cancel this booking?"
        confirmLabel="Cancel booking"
        confirmColor="error"
        onConfirm={cancel}
        onClose={() => setToCancel(null)}
      >
        {toCancel && (
          <Typography>
            {toCancel.courtName} on {formatDateTime(toCancel.startsAt, tz)}. The slot will be released for other players.
          </Typography>
        )}
      </ConfirmDialog>
    </Stack>
  );
}
