import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        // Redirection based on role
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser?.role === 'ADMIN') {
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
        <div className="card p-8 bg-white">
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

          {/* Quick Info Box for Demo */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 font-semibold mb-2">Demo Admin Login Credentials</p>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-[10px] text-slate-600 inline-block text-left">
              <div>Email: <span className="font-bold text-slate-900">admin@escrowtrust.com</span></div>
              <div>Pass:  <span className="font-bold text-slate-900">Admin@123</span></div>
            </div>
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
