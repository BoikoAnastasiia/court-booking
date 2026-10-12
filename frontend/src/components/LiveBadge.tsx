import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import type { RealtimeStatus } from '../realtime';

/** Small "Live" indicator for views that update over the WebSocket. */
export function LiveBadge({ status }: { status: RealtimeStatus }) {
  const live = status === 'live';
  return (
    <Tooltip title={live ? 'Updates appear automatically' : 'Live updates paused, reconnecting…'}>
      <Chip
        size="small"
        variant="outlined"
        label={live ? 'Live' : 'Reconnecting…'}
        icon={
          <Box
            component="span"
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: live ? 'success.main' : 'text.disabled',
              ...(live && {
                animation: 'live-pulse 2s ease-in-out infinite',
                '@keyframes live-pulse': { '50%': { opacity: 0.35 } },
              }),
            }}
          />
        }
        sx={{ '& .MuiChip-icon': { ml: 1 } }}
      />
    </Tooltip>
  );
}
