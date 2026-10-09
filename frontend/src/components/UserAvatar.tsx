import Avatar from '@mui/material/Avatar';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

export function UserAvatar({ name, src, size = 36 }: { name: string; src: string | null; size?: number }) {
  return (
    <Avatar src={src ?? undefined} alt={name} sx={{ width: size, height: size, fontSize: size * 0.4, bgcolor: 'primary.main' }}>
      {initials(name)}
    </Avatar>
  );
}
