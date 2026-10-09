import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, type CourtInput } from '../api';
import { formatHour, formatPrice } from '../format';
import type { Court } from '../types';

const EMPTY: CourtInput = { name: '', sport: 'padel', hourlyPriceCents: 2000, openHour: 8, closeHour: 22, isActive: true };
const HOURS = Array.from({ length: 25 }, (_, h) => h);

function CourtForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: CourtInput;
  submitLabel: string;
  onSubmit: (input: CourtInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [price, setPrice] = useState((initial.hourlyPriceCents / 100).toFixed(2));
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await onSubmit({ ...form, hourlyPriceCents: Math.round(Number(price) * 100) });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <form className="court-form" onSubmit={submit}>
      <label>
        Name
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </label>
      <label>
        Sport
        <input value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} required />
      </label>
      <label>
        Price / hour (€)
        <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
      </label>
      <label>
        Opens
        <select value={form.openHour} onChange={(e) => setForm({ ...form, openHour: Number(e.target.value) })}>
          {HOURS.slice(0, 24).map((h) => (
            <option key={h} value={h}>
              {formatHour(h)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Closes
        <select value={form.closeHour} onChange={(e) => setForm({ ...form, closeHour: Number(e.target.value) })}>
          {HOURS.slice(1).map((h) => (
            <option key={h} value={h}>
              {formatHour(h)}
            </option>
          ))}
        </select>
      </label>
      <div className="actions">
        <button type="submit">{submitLabel}</button>
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

export function AdminCourtsPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .courts()
      .then(setCourts)
      .catch((err: Error) => setError(err.message));
  }, []);
  useEffect(load, [load]);

  async function toggleActive(court: Court) {
    setError(null);
    try {
      await api.updateCourt(court.id, { isActive: !court.isActive });
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section>
      <h1>Courts</h1>
      {error && <p className="error">{error}</p>}

      {creating ? (
        <div className="card">
          <h2>New court</h2>
          <CourtForm
            initial={EMPTY}
            submitLabel="Create court"
            onSubmit={async (input) => {
              await api.createCourt(input);
              setCreating(false);
              load();
            }}
            onCancel={() => setCreating(false)}
          />
        </div>
      ) : (
        <button onClick={() => setCreating(true)}>+ Add court</button>
      )}

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Sport</th>
            <th>Price / h</th>
            <th>Hours</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {courts.map((c) =>
            editingId === c.id ? (
              <tr key={c.id}>
                <td colSpan={6}>
                  <CourtForm
                    initial={c}
                    submitLabel="Save"
                    onSubmit={async (input) => {
                      await api.updateCourt(c.id, input);
                      setEditingId(null);
                      load();
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                </td>
              </tr>
            ) : (
              <tr key={c.id} className={c.isActive ? '' : 'cancelled'}>
                <td>{c.name}</td>
                <td>{c.sport}</td>
                <td>{formatPrice(c.hourlyPriceCents)}</td>
                <td>
                  {formatHour(c.openHour)}–{formatHour(c.closeHour)}
                </td>
                <td>
                  <span className={`badge ${c.isActive ? 'confirmed' : 'cancelled'}`}>
                    {c.isActive ? 'active' : 'inactive'}
                  </span>
                </td>
                <td>
                  <div className="actions">
                    <button className="secondary small" onClick={() => setEditingId(c.id)}>
                    Edit
                  </button>
                  <button className={`small ${c.isActive ? 'danger' : ''}`} onClick={() => toggleActive(c)}>
                    {c.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  </div>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
      <p className="muted">Deactivated courts can't be booked, but their booking history is kept.</p>
    </section>
  );
}
