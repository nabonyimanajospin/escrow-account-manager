import { useState, useEffect } from 'react';
import axios from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', address: '', bio: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        bio: user.bio || '',
      });
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put('/auth/me', form);
      toast.success('Profile updated successfully!');
      if (refreshUser) refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (pwForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setSavingPw(true);
    try {
      await axios.put('/auth/me', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success('Password changed successfully!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed.');
    } finally {
      setSavingPw(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 text-primary-600 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const avatarLetter = user?.name?.[0]?.toUpperCase() || '?';

  return (
    <div className="page-wrapper max-w-4xl">
      {/* Header Card */}
      <div className="card p-6 bg-white border border-slate-200 mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white flex items-center justify-center text-3xl font-extrabold shadow-md">
            {avatarLetter}
          </div>
          <span className="absolute -bottom-2 -right-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-900 text-white border-2 border-white shadow-sm">
            {user.role}
          </span>
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-900">{user.name}</h1>
          <p className="text-xs text-slate-500 font-mono">{user.email}</p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
            {user.isKycVerified ? (
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1">
                ✅ KYC Verified
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1">
                ⚠️ KYC Pending
              </span>
            )}
            {user.walletBalance !== undefined && (
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold font-mono">
                💳 Wallet Balance: ${Number(user.walletBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`py-3 px-6 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          👤 Edit Profile Details
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`py-3 px-6 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'password'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🔒 Security & Password
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card p-6 bg-white border border-slate-200">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label" htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  className="input-field"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="input-label" htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  type="text"
                  className="input-field"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. 0788123456"
                />
              </div>

              <div className="md:col-span-2">
                <label className="input-label" htmlFor="address">Physical Address</label>
                <input
                  id="address"
                  type="text"
                  className="input-field"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Your location or office address"
                />
              </div>

              <div className="md:col-span-2">
                <label className="input-label" htmlFor="bio">Professional Bio</label>
                <textarea
                  id="bio"
                  rows={3}
                  className="input-field resize-none"
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Provide brief details about your trading portfolio..."
                />
              </div>

              <div>
                <label className="input-label">Email Address (System locked)</label>
                <input className="input-field bg-slate-50 font-mono text-slate-400" value={user.email} readOnly />
              </div>

              <div>
                <label className="input-label">Account Role (System locked)</label>
                <input className="input-field bg-slate-50 text-slate-400 font-bold" value={user.role} readOnly />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button type="submit" disabled={saving} className="btn-primary text-xs font-bold py-2.5 px-6">
                {saving ? 'Saving...' : '💾 Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="card p-6 bg-white border border-slate-200">
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            <div>
              <label className="input-label" htmlFor="currentPassword">Current Password</label>
              <input
                id="currentPassword"
                type="password"
                required
                className="input-field"
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
              />
            </div>

            <div>
              <label className="input-label" htmlFor="newPassword">New Password (Min. 8 characters)</label>
              <input
                id="newPassword"
                type="password"
                required
                className="input-field"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
              />
            </div>

            <div>
              <label className="input-label" htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                type="password"
                required
                className="input-field"
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
              />
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button type="submit" disabled={savingPw} className="btn-primary text-xs font-bold py-2.5 px-6 w-full sm:w-auto">
                {savingPw ? 'Updating Password...' : '🔒 Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
