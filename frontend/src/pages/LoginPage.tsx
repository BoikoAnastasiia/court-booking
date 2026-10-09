import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

const DEMO_ACCOUNTS = [
  { email: 'alice@example.com', password: 'password123', label: 'Alice · user' },
  { email: 'bob@example.com', password: 'password123', label: 'Bob · user' },
  { email: 'admin@example.com', password: 'admin123', label: 'Admin' },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login(email, password);
      navigate(user.role === 'admin' ? '/admin/day' : '/book');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={1} alignItems="center" sx={{ mb: 3 }}>
            <SportsTennisIcon color="primary" sx={{ fontSize: 40 }} />
            <Typography variant="h5" fontWeight={700}>
              Court Booking
            </Typography>
            <Typography color="text.secondary">Sign in to book your next game</Typography>
          </Stack>
          <Stack component="form" spacing={2} onSubmit={submit}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" size="large" loading={busy}>
              Sign in
            </Button>
          </Stack>
          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Demo accounts
            </Typography>
          </Divider>
          <Stack direction="row" spacing={1} justifyContent="center" useFlexGap flexWrap="wrap">
            {DEMO_ACCOUNTS.map((a) => (
              <Chip
                key={a.email}
                label={a.label}
                variant="outlined"
                clickable
                onClick={() => {
                  setEmail(a.email);
                  setPassword(a.password);
                }}
              />
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
