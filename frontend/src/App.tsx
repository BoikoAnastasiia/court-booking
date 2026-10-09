import type { ReactElement } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { Layout } from './components/Layout';
import type { Role } from './types';
import { AdminCourtsPage } from './pages/AdminCourtsPage';
import { AdminDayPage } from './pages/AdminDayPage';
import { BookPage } from './pages/BookPage';
import { LoginPage } from './pages/LoginPage';
import { MyBookingsPage } from './pages/MyBookingsPage';

/** UI-side guard for navigation only; the API enforces roles itself. */
function RequireRole({ role, children }: { role: Role; children: ReactElement }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin/day' : '/book'} replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<Layout />}>
        <Route path="/book" element={<RequireRole role="user"><BookPage /></RequireRole>} />
        <Route path="/my-bookings" element={<RequireRole role="user"><MyBookingsPage /></RequireRole>} />
        <Route path="/admin/day" element={<RequireRole role="admin"><AdminDayPage /></RequireRole>} />
        <Route path="/admin/courts" element={<RequireRole role="admin"><AdminCourtsPage /></RequireRole>} />
      </Route>
      <Route path="*" element={<Home />} />
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
