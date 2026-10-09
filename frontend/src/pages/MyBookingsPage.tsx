import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { formatDateTime, formatPrice, formatTime } from '../format';
import type { MyBooking } from '../types';

export function MyBookingsPage() {
  const { config } = useAuth();
  const [data, setData] = useState<{ upcoming: MyBooking[]; past: MyBooking[] } | null>(null);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  const load = useCallback(() => {
    api
      .myBookings()
      .then(setData)
      .catch((err: Error) => setMessage({ kind: 'error', text: err.message }));
  }, []);
  useEffect(load, [load]);

  async function cancel(b: MyBooking) {
    if (!window.confirm(`Cancel ${b.courtName} on ${formatDateTime(b.startsAt, config.facilityTimezone)}?`)) return;
    try {
      await api.cancelBooking(b.id);
      setMessage({ kind: 'success', text: 'Booking cancelled.' });
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    }
    load();
  }

  if (!data) return message ? <p className="error">{message.text}</p> : <p className="muted">Loading…</p>;

  const row = (b: MyBooking, showCancel: boolean) => (
    <tr key={b.id} className={b.status === 'cancelled' ? 'cancelled' : ''}>
      <td>{formatDateTime(b.startsAt, config.facilityTimezone)}</td>
      <td>{formatTime(b.endsAt, config.facilityTimezone)}</td>
      <td>{b.courtName}</td>
      <td>{formatPrice(b.priceCents)}</td>
      <td>
        <span className={`badge ${b.status}`}>{b.status}</span>
      </td>
      {showCancel && (
        <td>
          {b.status === 'confirmed' &&
            (b.canCancel ? (
              <button className="danger small" onClick={() => cancel(b)}>
                Cancel
              </button>
            ) : (
              <span className="muted" title={`Cancellation closes ${config.cancellationWindowHours}h before start`}>
                Too late to cancel
              </span>
            ))}
        </td>
      )}
    </tr>
  );

  return (
    <section>
      <h1>My bookings</h1>
      {message && <p className={message.kind}>{message.text}</p>}
      <p className="muted">
        Bookings can be cancelled up to {config.cancellationWindowHours} hours before they start.
      </p>

      <h2>Upcoming</h2>
      {data.upcoming.length === 0 ? (
        <p className="muted">No upcoming bookings.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Start</th>
              <th>Until</th>
              <th>Court</th>
              <th>Price</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>{data.upcoming.map((b) => row(b, true))}</tbody>
        </table>
      )}

      <h2>Past</h2>
      {data.past.length === 0 ? (
        <p className="muted">No past bookings.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Start</th>
              <th>Until</th>
              <th>Court</th>
              <th>Price</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>{data.past.map((b) => row(b, false))}</tbody>
        </table>
      )}
    </section>
  );
}
