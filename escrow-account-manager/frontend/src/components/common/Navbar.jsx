import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900';
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'SELLER': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'BUYER': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0 flex items-center space-x-2">
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
                🔒 EscrowTrust
              </span>
            </Link>

            {/* Navigation links (if logged in) */}
            {isAuthenticated && (
              <div className="hidden md:ml-6 md:flex md:space-x-2">
                <Link
                  to="/dashboard"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/dashboard')}`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/properties"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/properties')}`}
                >
                  Properties
                </Link>
                <Link
                  to="/transactions"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/transactions')}`}
                >
                  Transactions
                </Link>
              </div>
            )}
          </div>

          {/* User profile & actions */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                {/* User details */}
                <div className="hidden lg:flex flex-col items-end">
                  <span className="text-sm font-semibold text-gray-900">{user?.name}</span>
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border rounded-full ${getRoleBadgeColor(user?.role)}`}>
                    {user?.role}
                  </span>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="bg-gray-50 text-gray-700 hover:bg-red-50 hover:text-red-600 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:border-red-200 transition-all cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-primary-600 text-white hover:bg-primary-700 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile navigation links */}
      {isAuthenticated && (
        <div className="md:hidden flex space-x-1 justify-center pb-3 px-4 border-t border-gray-100 pt-2 bg-gray-50">
          <Link
            to="/dashboard"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isActive('/dashboard')}`}
          >
            Dashboard
          </Link>
          <Link
            to="/properties"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isActive('/properties')}`}
          >
            Properties
          </Link>
          <Link
            to="/transactions"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isActive('/transactions')}`}
          >
            Transactions
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
