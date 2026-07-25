import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Profile() {
  const token = localStorage.getItem('token');
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', bio: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [msg, setMsg] = useState(null);
  const [pwMsg, setPwMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const u = res.data.user;
        setUser(u);
        setForm({ name: u.name || '', phone: u.phone || '', address: u.address || '', bio: u.bio || '' });
      } catch {
        setMsg({ type: 'error', text: 'Failed to load profile.' });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [token]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await axios.put(`${API}/auth/me`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data.user);
      setMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Update failed.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      return setPwMsg({ type: 'error', text: 'New passwords do not match.' });
    }
    if (pwForm.newPassword.length < 6) {
      return setPwMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
    }
    setSavingPw(true);
    try {
      await axios.put(`${API}/auth/me`, {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setPwMsg({ type: 'success', text: 'Password changed successfully!' });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwMsg({ type: 'error', text: err.response?.data?.message || 'Password change failed.' });
    } finally {
      setSavingPw(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.spinner} />
        <p style={{ color: '#c8a96e', marginTop: 16 }}>Loading profile...</p>
      </div>
    );
  }

  const avatarLetter = user?.name?.[0]?.toUpperCase() || '?';
  const roleColor = { BUYER: '#3b82f6', SELLER: '#10b981', ADMIN: '#ef4444' };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* ── Header ── */}
        <div style={styles.header}>
          <div style={styles.avatarWrap}>
            <div style={styles.avatar}>{avatarLetter}</div>
            <div style={{ ...styles.roleBadge, background: roleColor[user.role] || '#6b7280' }}>
              {user.role}
            </div>
          </div>
          <div>
            <h1 style={styles.userName}>{user.name}</h1>
            <p style={styles.userEmail}>{user.email}</p>
            <div style={styles.badgeRow}>
              {user.isKycVerified && (
                <span style={styles.kycBadge}>✅ KYC Verified</span>
              )}
              {!user.isKycVerified && (
                <span style={styles.kycPending}>⚠ KYC Pending</span>
              )}
              {user.walletBalance !== undefined && (
                <span style={styles.walletBadge}>
                  💰 Wallet: ${Number(user.walletBalance).toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={styles.tabs}>
          {['profile', 'password'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}
            >
              {tab === 'profile' ? '👤 Edit Profile' : '🔒 Change Password'}
            </button>
          ))}
        </div>

        {/* ── Profile Tab ── */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSave} style={styles.form}>
            {msg && (
              <div style={{ ...styles.alert, background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2', borderColor: msg.type === 'success' ? '#10b981' : '#ef4444', color: msg.type === 'success' ? '#10b981' : '#ef4444' }}>
                {msg.type === 'success' ? '✅' : '❌'} {msg.text}
              </div>
            )}
            <div style={styles.grid}>
              <div style={styles.field}>
                <label style={styles.label}>Full Name</label>
                <input
                  style={styles.input}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your full name"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Phone Number</label>
                <input
                  style={styles.input}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. 0788123456"
                />
              </div>
              <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
                <label style={styles.label}>Address</label>
                <input
                  style={styles.input}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Your address"
                />
              </div>
              <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
                <label style={styles.label}>Bio</label>
                <textarea
                  style={{ ...styles.input, minHeight: 100, resize: 'vertical' }}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Tell buyers/sellers a bit about yourself..."
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Email (read-only)</label>
                <input style={{ ...styles.input, opacity: 0.5 }} value={user.email} readOnly />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Role (read-only)</label>
                <input style={{ ...styles.input, opacity: 0.5 }} value={user.role} readOnly />
              </div>
            </div>
            <button type="submit" style={styles.btn} disabled={saving}>
              {saving ? 'Saving...' : '💾 Save Changes'}
            </button>
          </form>
        )}

        {/* ── Password Tab ── */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordChange} style={styles.form}>
            {pwMsg && (
              <div style={{ ...styles.alert, background: pwMsg.type === 'success' ? '#f0fdf4' : '#fef2f2', borderColor: pwMsg.type === 'success' ? '#10b981' : '#ef4444', color: pwMsg.type === 'success' ? '#10b981' : '#ef4444' }}>
                {pwMsg.type === 'success' ? '✅' : '❌'} {pwMsg.text}
              </div>
            )}
            <div style={styles.grid}>
              <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
                <label style={styles.label}>Current Password</label>
                <input
                  type="password"
                  style={styles.input}
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>New Password</label>
                <input
                  type="password"
                  style={styles.input}
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  placeholder="Min. 6 characters"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Confirm New Password</label>
                <input
                  type="password"
                  style={styles.input}
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  placeholder="Repeat new password"
                />
              </div>
            </div>
            <button type="submit" style={styles.btn} disabled={savingPw}>
              {savingPw ? 'Changing...' : '🔒 Change Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
    padding: '40px 20px',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  container: {
    maxWidth: 780,
    margin: '0 auto',
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(200,169,110,0.15)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  loadingWrap: {
    minHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f0f1a',
  },
  spinner: {
    width: 48,
    height: 48,
    border: '4px solid rgba(200,169,110,0.2)',
    borderTop: '4px solid #c8a96e',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  header: {
    background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    padding: '40px 40px 32px',
    display: 'flex',
    alignItems: 'center',
    gap: 28,
    borderBottom: '1px solid rgba(200,169,110,0.15)',
  },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #c8a96e, #a07840)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 36,
    fontWeight: 700,
    color: '#1a1a2e',
    border: '3px solid rgba(200,169,110,0.5)',
  },
  roleBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    fontSize: 10,
    fontWeight: 700,
    color: '#fff',
    borderRadius: 8,
    padding: '2px 6px',
    letterSpacing: 0.5,
  },
  userName: { color: '#fff', fontSize: 26, fontWeight: 700, margin: '0 0 4px' },
  userEmail: { color: '#9ca3af', fontSize: 14, margin: '0 0 12px' },
  badgeRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  kycBadge: {
    background: 'rgba(16,185,129,0.15)',
    color: '#10b981',
    border: '1px solid rgba(16,185,129,0.3)',
    borderRadius: 20,
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 600,
  },
  kycPending: {
    background: 'rgba(245,158,11,0.15)',
    color: '#f59e0b',
    border: '1px solid rgba(245,158,11,0.3)',
    borderRadius: 20,
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 600,
  },
  walletBadge: {
    background: 'rgba(200,169,110,0.15)',
    color: '#c8a96e',
    border: '1px solid rgba(200,169,110,0.3)',
    borderRadius: 20,
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 600,
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid rgba(200,169,110,0.1)',
    background: 'rgba(0,0,0,0.2)',
  },
  tab: {
    flex: 1,
    padding: '16px',
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#c8a96e',
    borderBottom: '2px solid #c8a96e',
    background: 'rgba(200,169,110,0.05)',
  },
  form: { padding: '32px 40px 40px' },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
    marginBottom: 28,
  },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { color: '#9ca3af', fontSize: 13, fontWeight: 500 },
  input: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(200,169,110,0.2)',
    borderRadius: 10,
    padding: '12px 16px',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  },
  alert: {
    borderRadius: 10,
    padding: '12px 16px',
    marginBottom: 20,
    fontSize: 14,
    fontWeight: 500,
    border: '1px solid',
  },
  btn: {
    background: 'linear-gradient(135deg, #c8a96e, #a07840)',
    color: '#1a1a2e',
    border: 'none',
    borderRadius: 10,
    padding: '14px 32px',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
};
