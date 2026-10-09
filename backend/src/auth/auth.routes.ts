import bcrypt from 'bcryptjs';
import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { AppError, notFound } from '../errors';
import { authenticate, currentUser, signToken, type Role } from './auth.middleware';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

interface UserRow {
  id: number;
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
}

export function authRouter(db: Pool): Router {
  const router = Router();

  router.post('/login', async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const { rows } = await db.query<UserRow>(
      `SELECT id, email, name, role, password_hash AS "passwordHash"
         FROM users WHERE email = lower($1)`,
      [email],
    );
    const user = rows[0];
    // Same error for unknown email and wrong password: don't reveal which.
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    res.json({
      token: signToken({ id: user.id, role: user.role }),
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  });

  router.get('/me', authenticate, async (req, res) => {
    const { rows } = await db.query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [currentUser(req).id],
    );
    if (!rows[0]) throw notFound('User');
    res.json(rows[0]);
  });

  return router;
}
