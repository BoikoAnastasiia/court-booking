import DarkModeIcon from '@mui/icons-material/DarkModeOutlined';
import EditIcon from '@mui/icons-material/EditOutlined';
import LightModeIcon from '@mui/icons-material/LightModeOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import SystemModeIcon from '@mui/icons-material/SettingsBrightnessOutlined';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useColorScheme } from '@mui/material/styles';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useAuth } from '../auth';
import { ProfileDialog } from './ProfileDialog';
import { UserAvatar } from './UserAvatar';

type Mode = 'light' | 'system' | 'dark';

export function UserMenu() {
  const { user, logout } = useAuth();
  const { mode, setMode } = useColorScheme();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  if (!user) return null;

  return (
    <>
      <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label="Account menu" sx={{ p: 0.5 }}>
        <UserAvatar name={user.name} src={user.avatarUrl} />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 280, mt: 1 } } }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <UserAvatar name={user.name} src={user.avatarUrl} size={48} />
          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={600} noWrap>
              {user.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {user.email}
            </Typography>
            <Chip label={user.role} size="small" sx={{ mt: 0.5, textTransform: 'capitalize' }} />
          </Box>
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null);
            setProfileOpen(true);
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit profile
        </MenuItem>
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Theme
          </Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={mode ?? 'system'}
            onChange={(_e, value: Mode | null) => value && setMode(value)}
            sx={{ mt: 0.5 }}
          >
            <ToggleButton value="light" aria-label="Light theme">
              <LightModeIcon fontSize="small" sx={{ mr: 0.5 }} /> Light
            </ToggleButton>
            <ToggleButton value="system" aria-label="Device theme">
              <SystemModeIcon fontSize="small" sx={{ mr: 0.5 }} /> Device
            </ToggleButton>
            <ToggleButton value="dark" aria-label="Dark theme">
              <DarkModeIcon fontSize="small" sx={{ mr: 0.5 }} /> Dark
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Divider />
        <MenuItem onClick={logout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Log out
        </MenuItem>
      </Menu>
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
