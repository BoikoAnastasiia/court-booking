import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';

export function Layout() {
  const { user, logout } = useAuth();
  return (
    <>
      <header className="topbar">
        <span className="brand">🎾 Court Booking</span>
        <nav>
          {user?.role === 'user' && (
            <>
              <NavLink to="/book">Book a court</NavLink>
              <NavLink to="/my-bookings">My bookings</NavLink>
            </>
          )}
          {user?.role === 'admin' && (
            <>
              <NavLink to="/admin/day">Day overview</NavLink>
              <NavLink to="/admin/courts">Courts</NavLink>
            </>
          )}
        </nav>
        <span className="user">
          {user?.name} <span className="badge">{user?.role}</span>
          <button className="link" onClick={logout}>
            Log out
          </button>
        </span>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
