import Avatar from '@mui/material/Avatar';
import { UserIcon } from './UserIcon';

/** The user's photo, or a neutral person glyph when they haven't uploaded one. */
export function UserAvatar({ name, src, size = 36 }: { name: string; src: string | null; size?: number }) {
  return (
    <Avatar src={src ?? undefined} alt={name} sx={{ width: size, height: size, bgcolor: 'primary.main' }}>
      <UserIcon sx={{ fontSize: size * 0.55 }} />
    </Avatar>
  );
}
