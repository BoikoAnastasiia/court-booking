import Chip from '@mui/material/Chip';

export function StatusChip({ status }: { status: 'confirmed' | 'cancelled' | 'active' | 'inactive' }) {
  const positive = status === 'confirmed' || status === 'active';
  return (
    <Chip
      label={status}
      size="small"
      color={positive ? 'success' : 'default'}
      variant={positive ? 'outlined' : 'filled'}
      sx={{ textTransform: 'capitalize' }}
    />
  );
}
