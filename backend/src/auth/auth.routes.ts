import bcrypt from 'bcryptjs';
import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { AppError } from '../errors';
import { getUser } from '../users/users.service';
import { authenticate, currentUser, signToken, type Role } from './auth.middleware';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

interface CredentialsRow {
  id: number;
  role: Role;
  passwordHash: string;
}

export function authRouter(db: Pool): Router {
  const router = Router();

  router.post('/login', async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const { rows } = await db.query<CredentialsRow>(
      `SELECT id, role, password_hash AS "passwordHash" FROM users WHERE email = lower($1)`,
      [email],
    );
    const user = rows[0];
    // Same error for unknown email and wrong password: don't reveal which.
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    res.json({
      token: signToken({ id: user.id, role: user.role }),
      user: await getUser(db, user.id),
    });
  });

  router.get('/me', authenticate, async (req, res) => {
    res.json(await getUser(db, currentUser(req).id));
  });

  return router;
}
