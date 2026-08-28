import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from '../api/axiosConfig';
import BrandLogo from './BrandLogo';
import toast from 'react-hot-toast';

const isOtpNotification = (n) => {
  const title = String(n?.title || '');
  const message = String(n?.message || '');
  // Match real OTP notices only (not generic "verification" status emails)
  return (
    /verification approval code|otp|signing code|approval code/i.test(title) ||
    /verification approval code for deal|your verification code for|otp\b/i.test(message)
  );
};

const extractOtpCode = (message = '') => {
  const match = String(message).match(/\b(\d{4,6})\b/);
  return match ? match[1] : null;
};

/** OTP codes expire in ~10 minutes — ignore older leftover notifications */
const isRecentOtp = (n, maxAgeMs = 12 * 60 * 1000) => {
  if (!n?.createdAt) return false;
  const created = new Date(n.createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created <= maxAgeMs;
};

const dismissedOtpKey = (id) => `escrow_otp_dismissed_${id}`;

const wasOtpDismissed = (id) => {
  try {
    return sessionStorage.getItem(dismissedOtpKey(id)) === '1';
  } catch {
    return false;
  }
};

const markOtpDismissed = (id) => {
  try {
    sessionStorage.setItem(dismissedOtpKey(id), '1');
  } catch {
    /* ignore */
  }
};

const findDealNeedingOtp = (transactions, userId) => {
  if (!userId || !Array.isArray(transactions)) return null;
  return (
    transactions.find((tx) => {
      const isBuyer = tx.buyerId === userId;
      const isSeller = tx.sellerId === userId;
      if (!isBuyer && !isSeller) return false;
      const buyerOk = !!tx.buyerAuthorized;
      const sellerOk = !!tx.sellerAuthorized;
      if (tx.status === 'PENDING') {
        return (isBuyer && !buyerOk) || (isSeller && !sellerOk);
      }
      if (tx.status === 'FUNDED' || tx.status === 'MUTATION_STARTED') {
        return isSeller && !sellerOk;
      }
      return false;
    }) || null
  );
};

const userNeedsOtpSignature = (transactions, userId) => !!findDealNeedingOtp(transactions, userId);

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [otpPrompt, setOtpPrompt] = useState(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const dismissOtpPrompt = async (notificationId) => {
    if (notificationId) {
      markOtpDismissed(notificationId);
      try {
        await axios.post(`/notifications/${notificationId}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
      } catch (err) {
        console.error('Failed to mark OTP notification read', err);
      }
    }
    setOtpPrompt(null);
  };

  // Auto-close notification dropdown when clicking outside the bell UI
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target.closest('[data-notification-ui]')) return;
      setShowNotifications(false);
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showNotifications]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setOtpPrompt(null);
      return;
    }
    let knownIds = new Set();
    let primed = false;

    const fetchNotifications = async () => {
      try {
        const response = await axios.get('/notifications');
        const list = response.data.data || [];

        if (primed) {
          const fresh = list.filter((n) => !n.read && !knownIds.has(n.id));
          const freshOtp = fresh.find(
            (n) => isOtpNotification(n) && isRecentOtp(n) && !wasOtpDismissed(n.id)
          );

          let needsSignature = false;
          let activeDeal = null;
          try {
            const dealsRes = await axios.get('/escrow/my?limit=50');
            const deals = dealsRes.data?.data || [];
            activeDeal = findDealNeedingOtp(deals, user?.id);
            needsSignature = !!activeDeal;
          } catch (err) {
            needsSignature = false;
          }

          // If nothing needs signing, never keep/show an OTP popup
          if (!needsSignature) {
            setOtpPrompt(null);
            fresh.filter(isOtpNotification).forEach((n) => markOtpDismissed(n.id));
          } else if (freshOtp) {
            setOtpPrompt({
              id: freshOtp.id,
              title: freshOtp.title || 'OTP ready to sign',
              message: freshOtp.message || '',
              code: extractOtpCode(freshOtp.message),
              dealId: activeDeal?.id || null,
            });
          } else if (fresh.length === 1) {
            toast((t) => (
              <button
                type="button"
                className="text-left"
                onClick={() => {
                  toast.dismiss(t.id);
                  setShowNotifications(true);
                }}
              >
                <span className="font-bold block">{fresh[0].title || 'New notification'}</span>
                <span className="text-xs opacity-80">Tap to open your notification panel</span>
              </button>
            ), { icon: '🔔', duration: 6000 });
          } else if (fresh.length > 1) {
            toast((t) => (
              <button
                type="button"
                className="text-left"
                onClick={() => {
                  toast.dismiss(t.id);
                  setShowNotifications(true);
                }}
              >
                <span className="font-bold block">{fresh.length} new notifications</span>
                <span className="text-xs opacity-80">Open the bell panel to read them</span>
              </button>
            ), { icon: '🔔', duration: 6000 });
          }
        } else {
          // First load: never popup; silence leftover OTPs unless an active deal still needs signing
          setOtpPrompt(null);
          let needsSignature = false;
          try {
            const dealsRes = await axios.get('/escrow/my?limit=50');
            const deals = dealsRes.data?.data || [];
            needsSignature = userNeedsOtpSignature(deals, user?.id);
          } catch (err) {
            needsSignature = false;
          }
          if (!needsSignature) {
            list.filter(isOtpNotification).forEach((n) => markOtpDismissed(n.id));
          }
        }
        knownIds = new Set(list.map((n) => n.id));
        primed = true;
        setNotifications(list);
      } catch (err) {
        console.error('Failed to load notifications', err);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user?.id]);

  const handleMarkAsRead = async (notificationId, event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    try {
      await axios.post(`/notifications/${notificationId}/read`);
      // Keep the message in the list — only clear the unread badge/dot
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const bellButton = (
    <button
      type="button"
      data-notification-ui
      onClick={() => setShowNotifications((open) => !open)}
      className="p-1.5 text-slate-500 hover:text-slate-900 focus:outline-none relative rounded-full hover:bg-slate-100 transition-all cursor-pointer flex items-center justify-center"
      aria-label="Notifications"
      aria-expanded={showNotifications}
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
  );

  const notificationDropdown = showNotifications && (
    <div
      data-notification-ui
      className="fixed right-3 top-[4.25rem] w-[min(20rem,calc(100vw-1.5rem))] bg-white border border-slate-200 rounded-xl shadow-xl z-[60] overflow-hidden leading-relaxed animate-slide-down"
    >
      <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">Secure Inbox Notifications</span>
        {unreadCount > 0 ? (
          <span className="text-[8px] bg-primary-100 text-primary-700 font-extrabold px-1.5 py-0.5 rounded">
            {unreadCount} New
          </span>
        ) : (
          <span className="text-[8px] text-slate-400 font-bold uppercase">All read</span>
        )}
      </div>
      <div className="max-h-[min(320px,55vh)] overflow-y-auto divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <p className="text-[11px] text-slate-400 italic text-center py-6">No notifications received.</p>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              data-notification-ui
              onClick={(e) => handleMarkAsRead(n.id, e)}
              className={`w-full p-3 text-left hover:bg-slate-50 cursor-pointer transition-colors ${
                !n.read ? 'bg-primary-50/40' : 'bg-white'
              }`}
            >
              <div className="flex justify-between items-start gap-1">
                <p className={`text-[10px] font-bold ${!n.read ? 'text-primary-800' : 'text-slate-700'}`}>
                  {n.title}
                </p>
                {!n.read ? (
                  <span className="text-[8px] font-extrabold text-primary-600 uppercase shrink-0">New</span>
                ) : (
                  <span className="text-[8px] font-semibold text-slate-400 uppercase shrink-0">Read</span>
                )}
              </div>
              <p className="text-[10px] leading-normal mt-0.5 font-medium break-words text-slate-600">
                {n.message}
              </p>
              <span className="text-[8px] text-slate-400 font-mono mt-1 block">
                {new Date(n.createdAt).toLocaleString()}
              </span>
            </button>
          ))
        )}
      </div>
      <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 text-[9px] text-slate-500 font-semibold">
        Click a message to mark it read — it stays in your inbox. OTP codes are also emailed/SMS when configured.
      </div>
    </div>
  );

  return (
    <nav className="glass sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center min-w-0">
            <BrandLogo
              to="/"
              variant="icon"
              imgClassName="h-8 w-8"
              className="sm:hidden min-w-0"
            />
            <BrandLogo
              to="/"
              variant="primary"
              imgClassName="h-7 sm:h-9 w-auto max-w-[160px] sm:max-w-none"
              className="hidden sm:inline-flex min-w-0"
            />
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `text-sm font-semibold transition-colors ${
                  isActive ? 'text-emerald-600 font-extrabold' : 'text-slate-600 hover:text-slate-900'
                }`
              }
            >
              Home
            </NavLink>

            <NavLink
              to="/properties"
              className={({ isActive }) =>
                `text-sm font-semibold transition-colors ${
                  isActive ? 'text-emerald-600 font-extrabold' : 'text-slate-600 hover:text-slate-900'
                }`
              }
            >
              Property Catalog
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
                  {bellButton}

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
                    {(user?.role === 'BUYER' || user?.role === 'SELLER') && (
                      <Link
                        to="/wallet"
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 px-2 py-1 rounded hover:bg-emerald-50 transition-all"
                        title="Wallet"
                      >
                        Wallet
                      </Link>
                    )}
                    {user?.role === 'ADMIN' && (
                      <Link
                        to="/admin/treasury"
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 px-2 py-1 rounded hover:bg-emerald-50 transition-all"
                        title="Platform Treasury"
                      >
                        Treasury
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

          {/* Mobile: notifications + menu */}
          <div className="flex items-center gap-1 md:hidden">
            {isAuthenticated && bellButton}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-600 hover:text-slate-900 p-2 focus:outline-none"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
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
        <div className="md:hidden border-t border-slate-100 bg-white/95 shadow-lg animate-slide-down flex flex-col max-h-[calc(100dvh-4rem)]">
          <div className="px-4 pt-2 pb-4 space-y-2 overflow-y-auto flex-1">
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

              {(user?.role === 'BUYER' || user?.role === 'SELLER') && (
                <Link
                  to="/wallet"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-base font-semibold text-emerald-600 hover:bg-emerald-50"
                >
                  Wallet
                </Link>
              )}
              {user?.role === 'ADMIN' && (
                <Link
                  to="/admin/treasury"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-base font-semibold text-emerald-600 hover:bg-emerald-50"
                >
                  Treasury
                </Link>
              )}

              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-semibold text-slate-700 hover:bg-slate-50"
              >
                Profile
              </Link>

              {notifications.length > 0 && (
                <div className="px-3 py-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Recent notifications
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {notifications.slice(0, 5).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        data-notification-ui
                        onClick={(e) => handleMarkAsRead(n.id, e)}
                        className={`w-full text-left p-2.5 rounded-lg border text-xs ${
                          !n.read ? 'bg-primary-50 border-primary-200' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex justify-between gap-2">
                          <p className="font-bold text-slate-800">{n.title}</p>
                          <span className="text-[9px] font-bold uppercase text-slate-400 shrink-0">
                            {n.read ? 'Read' : 'New'}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-0.5 leading-snug">{n.message}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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

          {isAuthenticated && (
            <div className="border-t border-slate-200 bg-white px-4 py-3 shrink-0">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{user?.name}</p>
                    {user?.isKycVerified && (
                      <span className="text-[11px] text-emerald-500 font-extrabold" title="KYC/KYB Verified Identity">✓</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{user?.role}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full btn-secondary py-2.5 text-sm font-bold"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
      {notificationDropdown}

      {otpPrompt && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="otp-prompt-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="bg-indigo-600 px-5 py-4 text-white">
              <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">Action required</p>
              <h3 id="otp-prompt-title" className="text-lg font-extrabold mt-1">
                New OTP to sign your deal
              </h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm font-semibold text-slate-800">{otpPrompt.title}</p>
              <p className="text-xs text-slate-600 leading-relaxed">{otpPrompt.message}</p>
              {otpPrompt.code && (
                <div className="rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50 px-4 py-3 text-center">
                  <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Your signing code</p>
                  <p className="text-3xl font-black tracking-[0.35em] text-indigo-900 mt-1">{otpPrompt.code}</p>
                </div>
              )}
              <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                Open your escrow deal workspace and enter this code to continue. Do not ignore this — the deal cannot move forward until you sign.
              </p>
            </div>
            <div className="px-5 pb-5 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                className="btn-primary flex-1 text-sm font-bold py-2.5"
                onClick={() => {
                  const dealId = otpPrompt.dealId;
                  const code = otpPrompt.code;
                  dismissOtpPrompt(otpPrompt.id);
                  if (dealId) {
                    try {
                      sessionStorage.setItem(
                        'escrow_pending_otp',
                        JSON.stringify({ dealId, code: code || '' })
                      );
                    } catch {
                      /* ignore */
                    }
                    navigate(`/escrow/${dealId}?focus=otp`);
                  } else {
                    navigate('/dashboard');
                  }
                }}
              >
                Sign OTP now
              </button>
              <button
                type="button"
                className="btn-secondary flex-1 text-sm font-bold py-2.5"
                onClick={() => dismissOtpPrompt(otpPrompt.id)}
              >
                Remind me later
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
