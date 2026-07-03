import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = isAuthenticated
    ? [
        { to: '/dashboard',    label: 'Dashboard',    icon: '▦' },
        { to: '/properties',   label: 'Properties',   icon: '⌂' },
        { to: '/transactions', label: 'Transactions', icon: '⇄' },
      ]
    : [];

  const roleBadgeClass = { ADMIN: 'badge-role-admin', SELLER: 'badge-role-seller', BUYER: 'badge-role-buyer' };

  return (
    <nav className="glass sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">

          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl gradient-accent flex items-center justify-center text-white font-bold text-base shadow-md shadow-primary-500/20 group-hover:shadow-primary-500/35 transition-shadow">
                E
              </div>
              <span className="text-xl font-bold gradient-text tracking-tight hidden sm:block">
                EscrowTrust
              </span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive(link.to)
                      ? 'bg-primary-50 text-primary-700 font-semibold'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <div className="hidden lg:flex items-center gap-3 mr-1">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800 leading-tight">{user?.name}</p>
                    <span className={`badge text-[10px] ${roleBadgeClass[user?.role] || ''}`}>
                      {user?.role}
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-full gradient-accent flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn-ghost text-xs !px-3 !py-1.5 hover:!text-red-600 hover:!bg-red-50 hover:!border-red-200"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-ghost text-sm !px-4">Sign In</Link>
                <Link to="/register" className="btn-primary text-sm !py-2 !px-4">Get Started</Link>
              </div>
            )}

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors ml-1"
            >
              {mobileOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white animate-slide-down">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive(link.to)
                    ? 'bg-primary-50 text-primary-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated && (
              <div className="pt-2 mt-2 border-t border-slate-100">
                <p className="px-3 text-xs text-slate-400">
                  Signed in as <span className="text-primary-600 font-semibold">{user?.name}</span>
                  <span className={`badge ml-2 text-[10px] ${roleBadgeClass[user?.role] || ''}`}>{user?.role}</span>
                </p>
                <button
                  onClick={handleLogout}
                  className="mt-2 w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
