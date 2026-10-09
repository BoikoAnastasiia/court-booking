import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { authenticate, currentUser, requireRole } from '../auth/auth.middleware';
import { notFound } from '../errors';
import type { Clock } from '../lib/time';
import {
  createCourt,
  createCourtSchema,
  getAvailability,
  getCourt,
  listCourts,
  updateCourt,
  updateCourtSchema,
} from './courts.service';

const idParam = z.object({ id: z.coerce.number().int().positive() });
const dateQuery = z.object({ date: z.string() });

export function courtsRouter(db: Pool, clock: Clock): Router {
  const router = Router();
  router.use(authenticate);

  // Users only ever see active courts; admins see everything.
  router.get('/', async (req, res) => {
    const isAdmin = currentUser(req).role === 'admin';
    res.json(await listCourts(db, { includeInactive: isAdmin }));
  });

  router.get('/:id', async (req, res) => {
    const { id } = idParam.parse(req.params);
    const court = await getCourt(db, id);
    if (!court.isActive && currentUser(req).role !== 'admin') throw notFound('Court');
    res.json(court);
  });

  router.get('/:id/availability', async (req, res) => {
    const { id } = idParam.parse(req.params);
    const { date } = dateQuery.parse(req.query);
    res.json(await getAvailability(db, id, date, currentUser(req).id, clock()));
  });

  router.post('/', requireRole('admin'), async (req, res) => {
    const court = await createCourt(db, createCourtSchema.parse(req.body));
    res.status(201).json(court);
  });

  router.patch('/:id', requireRole('admin'), async (req, res) => {
    const { id } = idParam.parse(req.params);
    res.json(await updateCourt(db, id, updateCourtSchema.parse(req.body)));
  });

  return router;
}
