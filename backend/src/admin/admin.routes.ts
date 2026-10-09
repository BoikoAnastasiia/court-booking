import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { facilityDayBounds, parseFacilityDate } from '../lib/time';
import { avatarUrlSql } from '../users/users.service';

const dateQuery = z.object({ date: z.string() });

interface AdminBookingRow {
  id: number;
  courtId: number;
  courtName: string;
  courtSport: string;
  userId: number;
  userName: string;
  userEmail: string;
  userAvatarUrl: string | null;
  startsAt: Date;
  endsAt: Date;
  priceCents: number;
  status: 'confirmed' | 'cancelled';
}

export function adminRouter(db: Pool): Router {
  const router = Router();
  router.use(authenticate, requireRole('admin'));

  /**
   * All bookings starting on a facility-local day, across all courts
   * (including inactive ones). Revenue counts confirmed bookings only.
   */
  router.get('/bookings', async (req, res) => {
    const { date } = dateQuery.parse(req.query);
    const { start, end } = facilityDayBounds(parseFacilityDate(date));
    const { rows } = await db.query<AdminBookingRow>(
      `SELECT b.id, b.court_id AS "courtId", c.name AS "courtName", c.sport AS "courtSport",
              b.user_id AS "userId", u.name AS "userName", u.email AS "userEmail",
              ${avatarUrlSql('u')} AS "userAvatarUrl",
              b.starts_at AS "startsAt", b.ends_at AS "endsAt",
              b.price_cents AS "priceCents", b.status
         FROM bookings b
         JOIN courts c ON c.id = b.court_id
         JOIN users u ON u.id = b.user_id
        WHERE b.starts_at >= $1 AND b.starts_at < $2
        ORDER BY c.name, b.starts_at`,
      [start, end],
    );
    const confirmed = rows.filter((b) => b.status === 'confirmed');
    res.json({
      date,
      bookings: rows,
      confirmedCount: confirmed.length,
      totalRevenueCents: confirmed.reduce((sum, b) => sum + b.priceCents, 0),
    });
  });

  return router;
}
