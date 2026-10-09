-- Avatars are re-encoded server-side to a 200x200 WebP (~5–15 KB), small
-- enough to keep in the row and avoid a separate file store for this app.
ALTER TABLE users
  ADD COLUMN avatar            BYTEA,
  ADD COLUMN avatar_updated_at TIMESTAMPTZ,
  ADD CONSTRAINT users_avatar_consistent CHECK ((avatar IS NULL) = (avatar_updated_at IS NULL));
