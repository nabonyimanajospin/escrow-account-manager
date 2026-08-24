import { Link, NavLink } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <BrandLogo to="/" variant="primary" imgClassName="h-9 w-auto" />
        <nav className="flex flex-wrap items-center gap-3 text-sm font-bold text-slate-600">
          <NavLink
            to="/properties"
            className={({ isActive }) => (isActive ? 'text-primary-600' : 'hover:text-slate-900')}
          >
            Browse
          </NavLink>
          {user && (
            <>
              <NavLink
                to="/dashboard"
                className={({ isActive }) => (isActive ? 'text-primary-600' : 'hover:text-slate-900')}
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/wallet"
                className={({ isActive }) => (isActive ? 'text-primary-600' : 'hover:text-slate-900')}
              >
                Wallet
              </NavLink>
              {user.role === 'ADMIN' && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) => (isActive ? 'text-primary-600' : 'hover:text-slate-900')}
                >
                  Admin
                </NavLink>
              )}
            </>
          )}
          {!user ? (
            <Link to="/login" className="btn-primary !py-2 !px-4 text-xs">
              Demo login
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-emerald-800">
                {user.role}
              </span>
              <span className="hidden text-xs text-slate-500 sm:inline">{user.name}</span>
              <button type="button" onClick={logout} className="btn-secondary !py-1.5 !px-3 text-xs">
                Sign out
              </button>
            </div>
          )}
        </nav>
      </div>
      <div className="border-t border-amber-100 bg-amber-50 px-4 py-1.5 text-center text-[11px] font-semibold text-amber-900">
        Public demo · full escrow flow (OTP → fund → docs → admin) · mock data only
      </div>
    </header>
  );
}
