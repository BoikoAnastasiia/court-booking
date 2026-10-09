import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createColumnHelper } from '@tanstack/react-table';
import { DataTable } from './DataTable';

interface Row {
  id: number;
  name: string;
  price: number;
}
const column = createColumnHelper<Row>();
const columns = [column.accessor('name', { header: 'Name' }), column.accessor('price', { header: 'Price' })];
const rows: Row[] = [
  { id: 1, name: 'Padel 2', price: 30 },
  { id: 2, name: 'Padel 1', price: 10 },
  { id: 3, name: 'Clay', price: 20 },
];

const bodyNames = () =>
  within(screen.getAllByRole('rowgroup')[1]!)
    .getAllByRole('row')
    .map((row) => within(row).getAllByRole('cell')[0]!.textContent);

describe('DataTable', () => {
  it('applies the initial sorting', () => {
    render(<DataTable data={rows} columns={columns} getRowId={(r) => String(r.id)} emptyText="none" initialSorting={[{ id: 'price', desc: false }]} />);
    expect(bodyNames()).toEqual(['Padel 1', 'Clay', 'Padel 2']);
  });

  it('sorts when a header is clicked', async () => {
    render(<DataTable data={rows} columns={columns} getRowId={(r) => String(r.id)} emptyText="none" />);
    await userEvent.click(screen.getByRole('button', { name: 'Name' }));
    expect(bodyNames()).toEqual(['Clay', 'Padel 1', 'Padel 2']);
    await userEvent.click(screen.getByRole('button', { name: /Name/ }));
    expect(bodyNames()).toEqual(['Padel 2', 'Padel 1', 'Clay']);
  });

  it('shows the empty text when there are no rows', () => {
    render(<DataTable data={[]} columns={columns} getRowId={(r) => String(r.id)} emptyText="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });
});
