import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';
import { UserMenu } from './UserMenu';

const NAV = {
  user: [
    { to: '/book', label: 'Book a court' },
    { to: '/my-bookings', label: 'My bookings' },
  ],
  admin: [
    { to: '/admin/day', label: 'Day overview' },
    { to: '/admin/courts', label: 'Courts' },
  ],
} as const;

export function Layout() {
  const { user } = useAuth();
  return (
    <>
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
      >
        <Toolbar sx={{ gap: { xs: 1, sm: 3 } }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <SportsTennisIcon color="primary" />
            <Typography variant="h6" sx={{ display: { xs: 'none', sm: 'block' } }}>
              Court Booking
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} sx={{ flex: 1 }}>
            {user &&
              NAV[user.role].map((item) => (
                <Button
                  key={item.to}
                  component={NavLink}
                  to={item.to}
                  color="inherit"
                  sx={{
                    color: 'text.secondary',
                    '&.active': { color: 'primary.main', bgcolor: 'action.selected' },
                  }}
                >
                  {item.label}
                </Button>
              ))}
          </Stack>
          <UserMenu />
        </Toolbar>
      </AppBar>
      {/* Pages render their own <Page> container, so a hero can span the full width. */}
      <Box component="main">
        <Outlet />
      </Box>
    </>
  );
}
