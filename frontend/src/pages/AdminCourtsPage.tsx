import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { createColumnHelper } from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type CourtInput } from '../api';
import { sportsByCourtCount } from '../booking-options';
import { DataTable } from '../components/DataTable';
import { Page } from '../components/Page';
import { formatHour, formatPrice } from '../format';
import { useToast } from '../toast';
import type { Court } from '../types';
import { CourtDialog, EMPTY_COURT } from './admin/CourtDialog';

const column = createColumnHelper<Court>();

export function AdminCourtsPage() {
  const toast = useToast();
  const [courts, setCourts] = useState<Court[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // null = closed, 'new' = create, Court = edit
  const [editing, setEditing] = useState<Court | 'new' | null>(null);

  const load = useCallback(() => {
    api
      .courts()
      .then(setCourts)
      .catch((err: Error) => setError(err.message));
  }, []);
  useEffect(load, [load]);

  const toggleActive = useCallback(
    async (court: Court) => {
      try {
        await api.updateCourt(court.id, { isActive: !court.isActive });
        toast(`${court.name} ${court.isActive ? 'deactivated' : 'activated'}`);
        load();
      } catch (err) {
        toast((err as Error).message, 'error');
      }
    },
    [load, toast],
  );

  const columns = useMemo(
    () => [
      column.accessor('name', { header: 'Name', cell: (info) => <strong>{info.getValue()}</strong> }),
      column.accessor('sport', { header: 'Sport' }),
      column.accessor('hourlyPriceCents', {
        header: 'Price / h',
        meta: { align: 'right' },
        cell: (info) => formatPrice(info.getValue()),
      }),
      column.accessor('openHour', {
        header: 'Hours',
        cell: ({ row }) => `${formatHour(row.original.openHour)}–${formatHour(row.original.closeHour)}`,
      }),
      column.accessor('isActive', {
        header: 'Bookable',
        cell: ({ row }) => (
          <FormControlLabel
            control={<Switch checked={row.original.isActive} onChange={() => toggleActive(row.original)} size="small" />}
            label={row.original.isActive ? 'Active' : 'Inactive'}
          />
        ),
      }),
      column.display({
        id: 'actions',
        header: '',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => setEditing(row.original)} aria-label={`Edit ${row.original.name}`}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      }),
    ],
    [toggleActive],
  );

  async function save(input: CourtInput) {
    if (editing === 'new') {
      await api.createCourt(input);
      toast(`${input.name} created`);
    } else if (editing) {
      await api.updateCourt(editing.id, input);
      toast(`${input.name} saved`);
    }
    setEditing(null);
    load();
  }

  return (
    <Page>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
        <Box>
          <Typography variant="h4">Courts</Typography>
          <Typography color="text.secondary">
            Deactivated courts can't be booked, but their booking history is kept.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing('new')} sx={{ flexShrink: 0 }}>
          Add court
        </Button>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {!courts ? (
        <Skeleton variant="rounded" height={320} />
      ) : (
        <DataTable
          data={courts}
          columns={columns}
          getRowId={(c) => String(c.id)}
          initialSorting={[{ id: 'sport', desc: false }]}
          isRowMuted={(c) => !c.isActive}
          emptyText="No courts yet."
        />
      )}
      <CourtDialog
        initial={editing === 'new' ? EMPTY_COURT : editing}
        title={editing === 'new' ? 'New court' : 'Edit court'}
        sports={sportsByCourtCount(courts ?? [])}
        onSubmit={save}
        onClose={() => setEditing(null)}
      />
    </Page>
  );
}
