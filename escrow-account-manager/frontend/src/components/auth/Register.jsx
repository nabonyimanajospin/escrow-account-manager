import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'BUYER', phone: '', address: ''
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const { name, email, password, phone } = formData;
    if (!name || !email || !password || !phone) { setError('Please fill in all required fields'); return; }
    if (!/^[0-9]{10}$/.test(phone)) { setError('Phone number must be exactly 10 digits'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    const result = await register(formData);
    setLoading(false);
    if (result.success) navigate('/dashboard');
    else setError(result.error);
  };

  const pwStrength = () => {
    const p = formData.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 6) s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };
  const strength = pwStrength();
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][strength];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#059669'][strength];

  return (
    <div className="min-h-[calc(100vh-4rem)] hero-mesh flex items-center justify-center px-4 py-10">
      <div className="absolute top-10 right-1/4 w-56 h-56 bg-primary-200/25 rounded-full blur-[70px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-44 h-44 bg-accent-400/15 rounded-full blur-[60px] pointer-events-none" />

      <div className="relative w-full max-w-lg animate-slide-up">
        {/* Header */}
        <div className="text-center mb-7">
          <div className="w-14 h-14 gradient-accent rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg shadow-primary-500/25">
            E
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="text-slate-500 text-sm mt-1">Join EscrowTrust and transact with confidence</p>
        </div>

        {/* Role selector — visual cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { value: 'BUYER',  label: 'I am a Buyer',  desc: 'Looking to purchase property',  icon: '🏠' },
            { value: 'SELLER', label: 'I am a Seller', desc: 'Listing property for sale',      icon: '🏷️' },
          ].map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setFormData({ ...formData, role: r.value })}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                formData.role === r.value
                  ? 'border-primary-500 bg-primary-50 shadow-sm shadow-primary-500/15'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="text-2xl mb-1">{r.icon}</div>
              <p className={`text-sm font-bold ${formData.role === r.value ? 'text-primary-700' : 'text-slate-800'}`}>{r.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
            </button>
          ))}
        </div>

        {/* Card */}
        <div className="card p-7">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm p-3.5 rounded-xl animate-fade-in">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Full Name *</label>
                <input name="name" value={formData.name} onChange={handleChange} className="input-field" placeholder="John Doe" required />
              </div>
              <div>
                <label className="input-label">Phone (10 digits) *</label>
                <input name="phone" value={formData.phone} onChange={handleChange} className="input-field" placeholder="0781234567" pattern="[0-9]{10}" required />
              </div>
            </div>

            <div>
              <label className="input-label">Email Address *</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="input-field" placeholder="you@example.com" required />
            </div>

            <div>
              <label className="input-label">Password *</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field pr-10"
                  placeholder="Minimum 6 characters"
                  minLength="6"
                  required
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showPw ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
                  </svg>
                </button>
              </div>
              {formData.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4,5].map((i) => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all" style={{ background: i <= strength ? strengthColor : '#e2e8f0' }} />
                    ))}
                  </div>
                  <p className="text-xs font-medium" style={{ color: strengthColor }}>{strengthLabel}</p>
                </div>
              )}
            </div>

            <div>
              <label className="input-label">Physical Address</label>
              <textarea name="address" value={formData.address} onChange={handleChange} className="input-field resize-none" placeholder="Kigali, Rwanda" rows="2" />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full !py-3 text-base mt-1">
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </>
              ) : `Create ${formData.role === 'BUYER' ? 'Buyer' : 'Seller'} Account`}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-slate-100 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
