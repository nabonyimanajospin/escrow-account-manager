import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from '../api/axiosConfig';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }
    const fetchNotifications = async () => {
      try {
        const response = await axios.get('/notifications');
        setNotifications(response.data.data || []);
      } catch (err) {
        console.error('Failed to load notifications', err);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await axios.post(`/notifications/${notificationId}/read`);
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

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
                <div className="flex items-center gap-3 relative">
                  
                  {/* Notifications bell icon dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 focus:outline-none relative rounded-full hover:bg-slate-100 transition-all cursor-pointer flex items-center justify-center"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      {unreadCount > 0 && (
                        <span className="absolute top-0.5 right-0.5 inline-flex items-center justify-center px-1.5 py-0.5 text-[8px] font-bold leading-none text-white bg-red-600 rounded-full transform translate-x-1 -translate-y-1 animate-pulse">
                          {unreadCount}
                        </span>
                      )}
                    </button>

                    {showNotifications && (
                      <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden leading-relaxed animate-slide-down">
                        <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                          <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">Secure Inbox Notifications</span>
                          {unreadCount > 0 && <span className="text-[8px] bg-primary-100 text-primary-700 font-extrabold px-1.5 py-0.5 rounded">{unreadCount} New</span>}
                        </div>
                        <div className="max-h-[250px] overflow-y-auto divide-y divide-slate-100">
                          {notifications.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic text-center py-6">No notifications received.</p>
                          ) : (
                            notifications.map((n) => (
                              <div
                                key={n.id}
                                onClick={() => handleMarkAsRead(n.id)}
                                className={`p-3 text-left hover:bg-slate-50 cursor-pointer transition-colors ${!n.read ? 'bg-primary-50/20' : ''}`}
                              >
                                <div className="flex justify-between items-start gap-1">
                                  <p className={`text-[10px] font-bold ${!n.read ? 'text-primary-800' : 'text-slate-700'}`}>
                                    {n.title}
                                  </p>
                                  {!n.read && <span className="h-1.5 w-1.5 bg-primary-500 rounded-full shrink-0 mt-1" />}
                                </div>
                                <p className="text-[10px] text-slate-550 leading-normal mt-0.5 font-medium break-words text-slate-600">
                                  {n.message}
                                </p>
                                <span className="text-[8px] text-slate-400 font-mono mt-1 block">
                                  {new Date(n.createdAt).toLocaleTimeString()}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-right leading-tight">
                    <div className="flex items-center justify-end gap-1">
                      <p className="text-xs font-bold text-slate-800">{user?.name}</p>
                      {user?.isKycVerified && (
                        <span className="text-[10px] text-emerald-500 font-extrabold" title="KYC/KYB Verified Identity">✓</span>
                      )}
                    </div>
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
                  <div className="flex items-center gap-2">
                    <Link
                      to="/profile"
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 transition-all"
                      title="My Profile"
                    >
                      Profile
                    </Link>
                    {(user?.role === 'BUYER' || user?.role === 'SELLER') && (
                      <Link
                        to="/kyc"
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 transition-all"
                        title="KYC Verification"
                      >
                        🪪 KYC
                      </Link>
                    )}
                    {(user?.role === 'BUYER' || user?.role === 'SELLER' || user?.role === 'ADMIN') && (
                      <Link
                        to="/wallet"
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 px-2 py-1 rounded hover:bg-emerald-50 transition-all"
                        title="Wallet"
                      >
                        Wallet
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="btn-secondary !py-1.5 !px-3 text-xs"
                    >
                      Sign Out
                    </button>
                  </div>
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

              {(user?.role === 'BUYER' || user?.role === 'SELLER') && (
                <Link
                  to="/kyc"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-base font-semibold text-indigo-600 hover:bg-indigo-50"
                >
                  🪪 KYC Verification
                </Link>
              )}

              {(user?.role === 'BUYER' || user?.role === 'SELLER' || user?.role === 'ADMIN') && (
                <Link
                  to="/wallet"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-base font-semibold text-emerald-600 hover:bg-emerald-50"
                >
                  Wallet
                </Link>
              )}

              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-semibold text-slate-700 hover:bg-slate-50"
              >
                Profile
              </Link>

              <div className="border-t border-slate-100 my-2 pt-2" />
              <div className="px-3 py-2 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-bold text-slate-800">{user?.name}</p>
                    {user?.isKycVerified && (
                      <span className="text-[11px] text-emerald-500 font-extrabold" title="KYC/KYB Verified Identity">✓</span>
                    )}
                  </div>
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
