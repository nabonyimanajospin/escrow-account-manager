import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectFrom = location.state?.from;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      const res = await login(email, password);
      if (res.success) {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        
        // Preserve purchase intent if coming from a property page
        if (redirectFrom) {
          toast.success('Authenticated! Resuming your property transaction...');
          navigate(redirectFrom, { replace: true });
        } else if (storedUser?.role === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(res.error || 'Invalid email or password');
      }
    } catch (err) {
      console.error('Login submit error:', err.message);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 hero-mesh">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        
        {/* Header */}
        <div>
          <Link to="/" className="text-slate-400 hover:text-primary-600 transition-colors flex items-center gap-1 text-sm font-bold mb-6">
            &larr; Back to Home
          </Link>
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-slate-900 font-sans">
              Sign in to EscrowTrust
            </h2>
            <p className="mt-2 text-sm text-slate-500 font-medium">
              Access your secure escrow transactions
            </p>
          </div>
        </div>

        {/* Card Form */}
        <div className="card p-6 sm:p-8 bg-white max-w-full overflow-hidden">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-lg flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Email Address */}
            <div>
              <label className="input-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                required
                className="input-field"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label className="input-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5 font-bold flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Verifying Identity...</span>
                  </>
                ) : (
                  <span>Access Secure Escrow</span>
                )}
              </button>
            </div>
          </form>

          {/* Panel demo quick-fill (passwords managed via seed script) */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-3">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Panel Demo Accounts</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('buyer@escrowtrust.com');
                  setPassword('Buyer@123');
                  setError('');
                }}
                className="p-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-left transition-colors cursor-pointer"
              >
                <span className="text-[10px] font-bold text-blue-800 block">Buyer</span>
                <span className="text-[9px] text-blue-600 font-mono block truncate">buyer@...</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('seller@escrowtrust.com');
                  setPassword('Seller@123');
                  setError('');
                }}
                className="p-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-left transition-colors cursor-pointer"
              >
                <span className="text-[10px] font-bold text-emerald-800 block">Seller</span>
                <span className="text-[9px] text-emerald-600 font-mono block truncate">seller@...</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@escrowtrust.com');
                  setPassword('Admin@123');
                  setError('');
                }}
                className="p-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-left transition-colors cursor-pointer"
              >
                <span className="text-[10px] font-bold text-purple-800 block">Admin</span>
                <span className="text-[9px] text-purple-600 font-mono block truncate">admin@...</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Demo credentials are provisioned by the database seed script for presentation environments.
            </p>
          </div>
        </div>

        {/* Register navigation link */}
        <div className="text-center">
          <p className="text-sm text-slate-500 font-semibold">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-bold transition-colors">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
