import { Router } from 'express';
import multer from 'multer';
import type { Pool } from 'pg';
import { z } from 'zod';
import { authenticate, currentUser } from '../auth/auth.middleware';
import { AppError } from '../errors';
import {
  AVATAR_MAX_UPLOAD_BYTES,
  getAvatar,
  getUser,
  removeAvatar,
  setAvatar,
  updateProfile,
  updateProfileSchema,
} from './users.service';

const idParam = z.object({ id: z.coerce.number().int().positive() });

// Keep uploads in memory: they are size-capped and immediately re-encoded.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

export function usersRouter(db: Pool): Router {
  const router = Router();

  // Public on purpose: <img> tags can't send a bearer token, and avatars are
  // not sensitive. The ?v= param in avatarUrl makes long caching safe.
  router.get('/:id/avatar', async (req, res) => {
    const { id } = idParam.parse(req.params);
    const avatar = await getAvatar(db, id);
    res.set('Content-Type', 'image/webp');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(avatar);
  });

  router.get('/me', authenticate, async (req, res) => {
    res.json(await getUser(db, currentUser(req).id));
  });

  router.patch('/me', authenticate, async (req, res) => {
    const { name } = updateProfileSchema.parse(req.body);
    res.json(await updateProfile(db, currentUser(req).id, name));
  });

  router.put('/me/avatar', authenticate, upload.single('avatar'), async (req, res) => {
    if (!req.file) {
      throw new AppError(400, 'INVALID_IMAGE', 'Attach an image file in the "avatar" field');
    }
    res.json(await setAvatar(db, currentUser(req).id, req.file.buffer));
  });

  router.delete('/me/avatar', authenticate, async (req, res) => {
    res.json(await removeAvatar(db, currentUser(req).id));
  });

  return router;
}
