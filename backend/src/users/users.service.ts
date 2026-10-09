import type { Pool } from 'pg';
import sharp from 'sharp';
import { z } from 'zod';
import type { Role } from '../auth/auth.middleware';
import { AppError, notFound } from '../errors';

export const AVATAR_SIZE = 200;
export const AVATAR_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export interface PublicUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
}

/**
 * SQL expression for a user's avatar URL (or NULL). The version param lets
 * browsers cache the image forever and still pick up a new upload.
 */
export function avatarUrlSql(table: string): string {
  return `CASE WHEN ${table}.avatar_updated_at IS NULL THEN NULL
               ELSE '/api/users/' || ${table}.id || '/avatar?v='
                    || floor(extract(epoch FROM ${table}.avatar_updated_at))::bigint
          END`;
}

const USER_SELECT = `
  SELECT u.id, u.email, u.name, u.role, ${avatarUrlSql('u')} AS "avatarUrl"
    FROM users u`;

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function getUser(db: Pool, id: number): Promise<PublicUser> {
  const { rows } = await db.query<PublicUser>(`${USER_SELECT} WHERE u.id = $1`, [id]);
  if (!rows[0]) throw notFound('User');
  return rows[0];
}

export async function updateProfile(db: Pool, id: number, name: string): Promise<PublicUser> {
  await db.query('UPDATE users SET name = $2 WHERE id = $1', [id, name]);
  return getUser(db, id);
}

/**
 * Re-encodes any image sharp can decode into a square 200x200 WebP.
 * Re-encoding (rather than storing the upload) also strips EXIF metadata
 * such as GPS location, and neutralises files that only pretend to be images.
 */
export async function resizeAvatar(input: Buffer): Promise<Buffer> {
  try {
    return await sharp(input, { limitInputPixels: 40_000_000 })
      .rotate() // apply EXIF orientation before metadata is dropped
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'attention' })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new AppError(400, 'INVALID_IMAGE', 'The file is not a supported image');
  }
}

export async function setAvatar(db: Pool, id: number, upload: Buffer): Promise<PublicUser> {
  const avatar = await resizeAvatar(upload);
  await db.query('UPDATE users SET avatar = $2, avatar_updated_at = now() WHERE id = $1', [id, avatar]);
  return getUser(db, id);
}

export async function removeAvatar(db: Pool, id: number): Promise<PublicUser> {
  await db.query('UPDATE users SET avatar = NULL, avatar_updated_at = NULL WHERE id = $1', [id]);
  return getUser(db, id);
}

export async function getAvatar(db: Pool, id: number): Promise<Buffer> {
  const { rows } = await db.query<{ avatar: Buffer | null }>('SELECT avatar FROM users WHERE id = $1', [id]);
  if (!rows[0]?.avatar) throw notFound('Avatar');
  return rows[0].avatar;
}
