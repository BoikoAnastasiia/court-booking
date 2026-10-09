import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { authenticate, currentUser, requireRole } from '../auth/auth.middleware';
import type { Clock } from '../lib/time';
import { cancelBooking, createBooking, createBookingSchema, listUserBookings } from './bookings.service';

const idParam = z.object({ id: z.coerce.number().int().positive() });

export function bookingsRouter(db: Pool, clock: Clock): Router {
  const router = Router();
  // Bookings are a customer action; admins manage courts and view reports.
  router.use(authenticate, requireRole('user'));

  router.get('/me', async (req, res) => {
    res.json(await listUserBookings(db, currentUser(req).id, clock()));
  });

  router.post('/', async (req, res) => {
    const input = createBookingSchema.parse(req.body);
    res.status(201).json(await createBooking(db, currentUser(req).id, input, clock()));
  });

  // A state transition, not a deletion: the row is kept for history.
  router.post('/:id/cancel', async (req, res) => {
    const { id } = idParam.parse(req.params);
    res.json(await cancelBooking(db, currentUser(req).id, id, clock()));
  });

  return router;
}
