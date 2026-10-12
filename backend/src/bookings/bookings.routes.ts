import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { authenticate, currentUser, requireRole } from '../auth/auth.middleware';
import { facilityDateOf, type Clock } from '../lib/time';
import type { Publisher } from '../realtime/hub';
import { cancelBooking, createBooking, createBookingSchema, listUserBookings } from './bookings.service';

const idParam = z.object({ id: z.coerce.number().int().positive() });

export function bookingsRouter(db: Pool, clock: Clock, realtime: Publisher): Router {
  const router = Router();
  // Bookings are a customer action; admins manage courts and view reports.
  router.use(authenticate, requireRole('user'));

  router.get('/me', async (req, res) => {
    res.json(await listUserBookings(db, currentUser(req).id, clock()));
  });

  router.post('/', async (req, res) => {
    const input = createBookingSchema.parse(req.body);
    const booking = await createBooking(db, currentUser(req).id, input, clock());
    // Published only after the transaction committed, so listeners re-fetching
    // availability are guaranteed to see the new booking.
    realtime.publish({ type: 'availability.changed', courtId: booking.courtId, date: facilityDateOf(booking.startsAt) });
    res.status(201).json(booking);
  });

  // A state transition, not a deletion: the row is kept for history.
  router.post('/:id/cancel', async (req, res) => {
    const { id } = idParam.parse(req.params);
    const booking = await cancelBooking(db, currentUser(req).id, id, clock());
    realtime.publish({ type: 'availability.changed', courtId: booking.courtId, date: facilityDateOf(booking.startsAt) });
    res.json(booking);
  });

  return router;
}
