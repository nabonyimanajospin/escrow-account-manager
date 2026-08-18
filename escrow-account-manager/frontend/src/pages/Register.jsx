import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const [role, setRole] = useState('BUYER'); // BUYER or SELLER
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !phone) {
      setError('Please fill in all required fields (Name, Email, Password, Phone)');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      setError('Phone number must be exactly 10 digits (e.g. 0780000000)');
      return;
    }

    try {
      setLoading(true);
      const res = await register({
        name,
        email,
        password,
        role,
        phone,
        address,
      });

      if (res.success) {
        navigate('/dashboard');
      } else {
        setError(res.error || 'Registration failed');
      }
    } catch (err) {
      console.error('Registration submit error:', err.message);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 hero-mesh">
      <div className="max-w-lg w-full space-y-8 animate-fade-in">
        
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-5">
            <BrandLogo to="/" variant="primary" imgClassName="h-10 sm:h-11 w-auto" />
          </div>
          <span className="text-sm font-bold text-primary-600 uppercase tracking-widest font-mono">Create Secure Account</span>
          <h2 className="mt-2 text-3xl font-extrabold text-slate-900 font-sans">
            Get started with EscrowTrust
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-semibold">
            Choose your role and register to begin trading securely
          </p>
        </div>

        {/* Card Form */}
        <div className="auth-portal-frame">
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

            {/* Role Selection (Visual Cards) */}
            <div>
              <label className="input-label mb-3">Registering as a:</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole('BUYER')}
                  className={`p-4 rounded-xl border-2 text-left cursor-pointer transition-all flex flex-col justify-between h-28 ${
                    role === 'BUYER'
                      ? 'border-primary-600 bg-primary-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <p className={`text-sm font-bold ${role === 'BUYER' ? 'text-primary-700' : 'text-slate-700'}`}>Property Buyer</p>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">Buy listings, deposit funds into escrow securely.</p>
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider ${role === 'BUYER' ? 'text-primary-700' : 'text-slate-400'}`}>
                    {role === 'BUYER' ? 'Selected' : 'Choose'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('SELLER')}
                  className={`p-4 rounded-xl border-2 text-left cursor-pointer transition-all flex flex-col justify-between h-28 ${
                    role === 'SELLER'
                      ? 'border-primary-600 bg-primary-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <p className={`text-sm font-bold ${role === 'SELLER' ? 'text-primary-700' : 'text-slate-700'}`}>Property Seller</p>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">Create property listings and manage mutations.</p>
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider ${role === 'SELLER' ? 'text-primary-700' : 'text-slate-400'}`}>
                    {role === 'SELLER' ? 'Selected' : 'Choose'}
                  </span>
                </button>
              </div>
            </div>

            {/* Profile Information */}
            <div className="space-y-4">
              <div>
                <label className="input-label" htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  required
                  className="input-field"
                  placeholder="Jospin Nabonyimana"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="input-label" htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  required
                  className="input-field"
                  placeholder="jospin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="input-label" htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    required
                    className="input-field"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="input-label" htmlFor="phone">Phone Number</label>
                  <input
                    id="phone"
                    type="text"
                    required
                    className="input-field font-mono"
                    placeholder="10 digits, e.g. 0780000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="input-label" htmlFor="address">Physical Address</label>
                <input
                  id="address"
                  type="text"
                  className="input-field"
                  placeholder="Kigali, Rwanda"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={loading}
                />
              </div>
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
                    <span>Creating Secure Account...</span>
                  </>
                ) : (
                  <span>Register Securely</span>
                )}
              </button>
            </div>
          </form>
          </div>
        </div>

        {/* Login navigation link */}
        <div className="text-center">
          <p className="text-sm text-slate-500 font-semibold">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-bold transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
