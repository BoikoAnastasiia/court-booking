import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';

declare module '@tanstack/react-table' {
  // Extra per-column options read by DataTable below.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: 'left' | 'right' | 'center';
  }
}

interface DataTableProps<T> {
  data: T[];
  // TanStack's own docs type heterogeneous column arrays with `any` values.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[];
  getRowId: (row: T) => string;
  emptyText: string;
  initialSorting?: SortingState;
  /** Greyed-out rows, e.g. cancelled bookings or inactive courts. */
  isRowMuted?: (row: T) => boolean;
}

/** TanStack Table (headless: state, sorting) rendered with MUI table components. */
export function DataTable<T>({ data, columns, getRowId, emptyText, initialSorting = [], isRowMuted }: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const rows = table.getRowModel().rows;

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                const label = flexRender(header.column.columnDef.header, header.getContext());
                return (
                  <TableCell
                    key={header.id}
                    align={header.column.columnDef.meta?.align}
                    sortDirection={sorted || false}
                    sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}
                  >
                    {header.column.getCanSort() ? (
                      <TableSortLabel
                        active={!!sorted}
                        direction={sorted || 'asc'}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {label}
                      </TableSortLabel>
                    ) : (
                      label
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id} hover sx={isRowMuted?.(row.original) ? { opacity: 0.55 } : undefined}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} align={cell.column.columnDef.meta?.align}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
