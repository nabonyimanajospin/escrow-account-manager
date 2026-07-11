import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="glass sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="font-extrabold text-xl tracking-tight gradient-text">
                EscrowTrust
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-primary-100 text-primary-700 border border-primary-200">
                Secure Escrow
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <NavLink
              to="/properties"
              className={({ isActive }) =>
                `text-sm font-semibold transition-colors ${
                  isActive ? 'text-primary-600' : 'text-slate-600 hover:text-slate-900'
                }`
              }
            >
              Browse Properties
            </NavLink>

            {isAuthenticated ? (
              <>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    `text-sm font-semibold transition-colors ${
                      isActive ? 'text-primary-600' : 'text-slate-600 hover:text-slate-900'
                    }`
                  }
                >
                  Dashboard
                </NavLink>

                {user?.role === 'SELLER' && (
                  <NavLink
                    to="/properties/create"
                    className={({ isActive }) =>
                      `text-sm font-semibold transition-colors ${
                        isActive ? 'text-primary-600' : 'text-slate-600 hover:text-slate-900'
                      }`
                    }
                  >
                    Add Listing
                  </NavLink>
                )}

                {user?.role === 'ADMIN' && (
                  <NavLink
                    to="/admin"
                    className={({ isActive }) =>
                      `text-sm font-semibold transition-colors ${
                        isActive ? 'text-primary-600' : 'text-slate-600 hover:text-slate-900'
                      }`
                    }
                  >
                    Admin Panel
                  </NavLink>
                )}

                <div className="h-4 w-px bg-slate-200" />

                {/* User Session Profile & Actions */}
                <div className="flex items-center gap-3">
                  <div className="text-right leading-tight">
                    <p className="text-xs font-bold text-slate-800">{user?.name}</p>
                    <span
                      className={`badge text-[9px] px-1.5 py-0.5 leading-none ${
                        user?.role === 'ADMIN'
                          ? 'badge-role-admin'
                          : user?.role === 'SELLER'
                          ? 'badge-role-seller'
                          : 'badge-role-buyer'
                      }`}
                    >
                      {user?.role}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="btn-secondary !py-1.5 !px-3 text-xs"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/login" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary !py-1.5 !px-4 text-xs">
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-600 hover:text-slate-900 p-2 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white/95 px-4 pt-2 pb-4 space-y-2 shadow-lg animate-slide-down">
          <Link
            to="/properties"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-semibold text-slate-700 hover:bg-slate-50"
          >
            Browse Properties
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-semibold text-slate-700 hover:bg-slate-50"
              >
                Dashboard
              </Link>

              {user?.role === 'SELLER' && (
                <Link
                  to="/properties/create"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-base font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Add Listing
                </Link>
              )}

              {user?.role === 'ADMIN' && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-base font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Admin Panel
                </Link>
              )}

              <div className="border-t border-slate-100 my-2 pt-2" />
              <div className="px-3 py-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">{user?.name}</p>
                  <p className="text-xs text-slate-500 font-medium">{user?.role}</p>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="btn-secondary !py-1.5 !px-3 text-xs"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2 pt-2 px-3">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-lg"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-primary text-center py-2 text-sm font-semibold"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
