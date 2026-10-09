import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { formatPrice, formatTime, todayIn } from '../format';
import type { AdminDay } from '../types';

export function AdminDayPage() {
  const { config } = useAuth();
  const tz = config.facilityTimezone;
  const [date, setDate] = useState(todayIn(tz));
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

  return (
    <section>
      <h1>Day overview</h1>
      <div className="toolbar">
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
      </div>
      {error && <p className="error">{error}</p>}

      {day && (
        <>
          <div className="stats">
            <div className="card stat">
              <span className="muted">Expected revenue</span>
              <strong>{formatPrice(day.totalRevenueCents)}</strong>
            </div>
            <div className="card stat">
              <span className="muted">Confirmed bookings</span>
              <strong>{day.confirmedCount}</strong>
            </div>
          </div>
          {day.bookings.length === 0 ? (
            <p className="muted">No bookings on this day.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Court</th>
                  <th>Time</th>
                  <th>Customer</th>
                  <th>Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {day.bookings.map((b) => (
                  <tr key={b.id} className={b.status === 'cancelled' ? 'cancelled' : ''}>
                    <td>{b.courtName}</td>
                    <td>
                      {formatTime(b.startsAt, tz)}–{formatTime(b.endsAt, tz)}
                    </td>
                    <td>
                      {b.userName} <span className="muted">{b.userEmail}</span>
                    </td>
                    <td>{formatPrice(b.priceCents)}</td>
                    <td>
                      <span className={`badge ${b.status}`}>{b.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="muted">Revenue counts confirmed bookings only, at the price paid when booked.</p>
        </>
      )}
    </section>
  );
}
