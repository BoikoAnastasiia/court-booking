import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '../api';
import { useAuth } from '../auth';
import { availableDurations } from '../booking-options';
import { formatHour, formatPrice, todayIn } from '../format';
import type { Availability, Court } from '../types';

const STATUS_LABEL = { available: 'Free', booked: 'Taken', mine: 'Yours', past: 'Past' } as const;

export function BookPage() {
  const { config } = useAuth();
  const today = todayIn(config.facilityTimezone);
  const [courts, setCourts] = useState<Court[]>([]);
  const [courtId, setCourtId] = useState<number | null>(null);
  const [date, setDate] = useState(today);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .courts()
      .then((list) => {
        setCourts(list);
        setCourtId((current) => current ?? list[0]?.id ?? null);
      })
      .catch((err: Error) => setMessage({ kind: 'error', text: err.message }));
  }, []);

  const loadAvailability = useCallback(async () => {
    if (courtId === null || !date) return;
    try {
      setAvailability(await api.availability(courtId, date));
    } catch (err) {
      setAvailability(null);
      setMessage({ kind: 'error', text: (err as Error).message });
    }
  }, [courtId, date]);

  useEffect(() => {
    setSelectedHour(null);
    void loadAvailability();
  }, [loadAvailability]);

  async function book(durationHours: 1 | 2) {
    if (courtId === null || selectedHour === null) return;
    setBusy(true);
    setMessage(null);
    try {
      await api.createBooking({ courtId, date, startHour: selectedHour, durationHours });
      setMessage({
        kind: 'success',
        text: `Booked ${formatHour(selectedHour)}–${formatHour(selectedHour + durationHours)} on ${date}.`,
      });
    } catch (err) {
      const text =
        err instanceof ApiError && err.code === 'SLOT_TAKEN'
          ? 'Someone just booked that slot. Availability has been refreshed.'
          : (err as Error).message;
      setMessage({ kind: 'error', text });
    } finally {
      setSelectedHour(null);
      setBusy(false);
      void loadAvailability();
    }
  }

  const court = availability?.court;
  const durations = availability && selectedHour !== null ? availableDurations(availability.slots, selectedHour) : [];

  return (
    <section>
      <h1>Book a court</h1>
      {courts.length === 0 && !message && <p className="muted">No courts are available right now.</p>}

      <div className="toolbar">
        <label>
          Court
          <select value={courtId ?? ''} onChange={(e) => setCourtId(Number(e.target.value))}>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.sport} · {formatPrice(c.hourlyPriceCents)}/h
              </option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} required />
        </label>
      </div>

      {message && <p className={message.kind}>{message.text}</p>}

      {court && availability && (
        <div className="card">
          <p className="muted">
            Open {formatHour(court.openHour)}–{formatHour(court.closeHour)} · times in {config.facilityTimezone}
          </p>
          <div className="slots">
            {availability.slots.map((slot) => (
              <button
                key={slot.startHour}
                className={`slot ${slot.status} ${selectedHour === slot.startHour ? 'selected' : ''}`}
                disabled={slot.status !== 'available'}
                onClick={() => setSelectedHour(slot.startHour)}
                aria-pressed={selectedHour === slot.startHour}
              >
                <strong>{formatHour(slot.startHour)}</strong>
                <span>{STATUS_LABEL[slot.status]}</span>
              </button>
            ))}
          </div>

          {selectedHour !== null && (
            <div className="confirm">
              {durations.map((d) => (
                <button key={d} disabled={busy} onClick={() => book(d)}>
                  Book {formatHour(selectedHour)}–{formatHour(selectedHour + d)} ({d}h) ·{' '}
                  {formatPrice(court.hourlyPriceCents * d)}
                </button>
              ))}
              <button className="secondary" onClick={() => setSelectedHour(null)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
