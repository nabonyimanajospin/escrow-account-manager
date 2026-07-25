import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function SellerWallet() {
  const token = localStorage.getItem('token');
  const [wallet, setWallet] = useState(null);
  const [history, setHistory] = useState([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [msg, setMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchWallet = async () => {
    try {
      const [walletRes, historyRes] = await Promise.all([
        axios.get(`${API}/wallet`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/wallet/history`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setWallet(walletRes.data.wallet);
      setHistory(historyRes.data.transactions || []);
    } catch {
      setMsg({ type: 'error', text: 'Failed to load wallet data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWallet(); }, [token]);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      return setMsg({ type: 'error', text: 'Enter a valid withdrawal amount.' });
    }
    setWithdrawing(true);
    try {
      const res = await axios.post(`${API}/wallet/withdraw`,
        { amount: withdrawAmount, notes: withdrawNotes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMsg({ type: 'success', text: res.data.message });
      setWithdrawAmount('');
      setWithdrawNotes('');
      fetchWallet();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Withdrawal failed.' });
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div style={ws.loadingWrap}>
        <div style={ws.spinner} />
        <p style={{ color: '#c8a96e', marginTop: 12 }}>Loading wallet...</p>
      </div>
    );
  }

  const typeColor = {
    CREDIT: '#10b981',
    WITHDRAWAL_REQUEST: '#f59e0b',
    WITHDRAWAL_PAID: '#3b82f6',
  };
  const typeLabel = {
    CREDIT: '+ Credit',
    WITHDRAWAL_REQUEST: '↑ Withdrawal Request',
    WITHDRAWAL_PAID: '✓ Withdrawal Paid',
  };
  const statusColor = { COMPLETED: '#10b981', PENDING: '#f59e0b', REJECTED: '#ef4444' };

  return (
    <div style={ws.page}>
      <div style={ws.container}>
        {/* ── Header ── */}
        <div style={ws.header}>
          <div>
            <h1 style={ws.heading}>💰 Seller Wallet</h1>
            <p style={ws.subtext}>Manage your escrow earnings and withdrawals</p>
          </div>
          <div style={ws.balanceCard}>
            <p style={ws.balanceLabel}>Available Balance</p>
            <p style={ws.balanceAmount}>${Number(wallet?.balance || 0).toFixed(2)}</p>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div style={ws.statsRow}>
          <div style={ws.stat}>
            <p style={ws.statLabel}>Total Earned</p>
            <p style={ws.statValue}>${Number(wallet?.totalEarned || 0).toFixed(2)}</p>
          </div>
          <div style={ws.stat}>
            <p style={ws.statLabel}>Pending Withdrawals</p>
            <p style={{ ...ws.statValue, color: '#f59e0b' }}>${Number(wallet?.pendingWithdrawals || 0).toFixed(2)}</p>
          </div>
          <div style={ws.stat}>
            <p style={ws.statLabel}>Total Withdrawn</p>
            <p style={{ ...ws.statValue, color: '#3b82f6' }}>${Number(wallet?.totalWithdrawn || 0).toFixed(2)}</p>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={ws.tabs}>
          {['overview', 'withdraw'].map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              style={{ ...ws.tab, ...(activeTab === t ? ws.tabActive : {}) }}>
              {t === 'overview' ? '📋 Transaction History' : '💸 Request Withdrawal'}
            </button>
          ))}
        </div>

        {msg && (
          <div style={{ ...ws.alert, background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2', borderColor: msg.type === 'success' ? '#10b981' : '#ef4444', color: msg.type === 'success' ? '#10b981' : '#ef4444', margin: '0 32px' }}>
            {msg.type === 'success' ? '✅' : '❌'} {msg.text}
          </div>
        )}

        {/* ── History Tab ── */}
        {activeTab === 'overview' && (
          <div style={ws.section}>
            {history.length === 0 ? (
              <div style={ws.empty}>
                <p style={{ fontSize: 48 }}>💼</p>
                <p style={ws.emptyText}>No wallet transactions yet.</p>
                <p style={{ color: '#6b7280', fontSize: 13 }}>Funds will appear here when an escrow is released to you.</p>
              </div>
            ) : (
              <table style={ws.table}>
                <thead>
                  <tr>
                    {['Date', 'Type', 'Amount', 'Reference', 'Status'].map((h) => (
                      <th key={h} style={ws.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((tx) => (
                    <tr key={tx.id} style={ws.tr}>
                      <td style={ws.td}>{new Date(tx.createdAt).toLocaleDateString()}</td>
                      <td style={{ ...ws.td, color: typeColor[tx.type] || '#fff', fontWeight: 600 }}>
                        {typeLabel[tx.type] || tx.type}
                      </td>
                      <td style={{ ...ws.td, fontWeight: 700, color: tx.type === 'CREDIT' ? '#10b981' : '#f59e0b' }}>
                        {tx.type === 'CREDIT' ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                      </td>
                      <td style={{ ...ws.td, color: '#9ca3af', fontSize: 12 }}>{tx.reference || '—'}</td>
                      <td style={ws.td}>
                        <span style={{ ...ws.statusBadge, background: `${statusColor[tx.status]}22`, color: statusColor[tx.status] }}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Withdrawal Tab ── */}
        {activeTab === 'withdraw' && (
          <div style={ws.section}>
            <div style={ws.infoBox}>
              <p style={{ color: '#c8a96e', fontWeight: 600, margin: '0 0 8px' }}>📋 How Withdrawals Work</p>
              <ul style={{ color: '#9ca3af', fontSize: 13, margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
                <li>Submit a withdrawal request for any amount up to your available balance</li>
                <li>Amount is deducted from your balance immediately</li>
                <li>Admin will process the actual payment within 2–3 business days</li>
                <li>Payment is sent to your registered bank account or mobile money</li>
              </ul>
            </div>
            <form onSubmit={handleWithdraw} style={ws.form}>
              <div style={ws.field}>
                <label style={ws.label}>Withdrawal Amount (USD)</label>
                <input
                  style={ws.input}
                  type="number"
                  min="1"
                  max={wallet?.balance || 0}
                  step="0.01"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder={`Max: $${Number(wallet?.balance || 0).toFixed(2)}`}
                />
              </div>
              <div style={ws.field}>
                <label style={ws.label}>Notes (optional — bank account, mobile money number, etc.)</label>
                <textarea
                  style={{ ...ws.input, minHeight: 80, resize: 'vertical' }}
                  value={withdrawNotes}
                  onChange={(e) => setWithdrawNotes(e.target.value)}
                  placeholder="e.g. MTN Mobile Money: 0788123456 / Bank: EQUITY BANK / ACC: 1234567"
                />
              </div>
              <button type="submit" style={ws.btn} disabled={withdrawing || !wallet?.balance}>
                {withdrawing ? 'Submitting...' : '💸 Submit Withdrawal Request'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

const ws = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
    padding: '40px 20px',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  container: {
    maxWidth: 900,
    margin: '0 auto',
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(200,169,110,0.15)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, background: '#0f0f1a' },
  spinner: { width: 40, height: 40, border: '4px solid rgba(200,169,110,0.2)', borderTop: '4px solid #c8a96e', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  header: { background: 'linear-gradient(135deg, #1a1a2e, #16213e)', padding: '32px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(200,169,110,0.1)', flexWrap: 'wrap', gap: 20 },
  heading: { color: '#fff', fontSize: 26, fontWeight: 700, margin: 0 },
  subtext: { color: '#9ca3af', fontSize: 14, margin: '6px 0 0' },
  balanceCard: { background: 'rgba(200,169,110,0.1)', border: '1px solid rgba(200,169,110,0.3)', borderRadius: 16, padding: '20px 32px', textAlign: 'center' },
  balanceLabel: { color: '#9ca3af', fontSize: 12, fontWeight: 600, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 1 },
  balanceAmount: { color: '#c8a96e', fontSize: 36, fontWeight: 800, margin: 0 },
  statsRow: { display: 'flex', gap: 0, borderBottom: '1px solid rgba(200,169,110,0.1)' },
  stat: { flex: 1, padding: '20px 24px', borderRight: '1px solid rgba(200,169,110,0.08)', textAlign: 'center' },
  statLabel: { color: '#6b7280', fontSize: 12, fontWeight: 600, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { color: '#10b981', fontSize: 22, fontWeight: 700, margin: 0 },
  tabs: { display: 'flex', borderBottom: '1px solid rgba(200,169,110,0.1)', background: 'rgba(0,0,0,0.2)' },
  tab: { flex: 1, padding: 16, background: 'none', border: 'none', color: '#9ca3af', fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' },
  tabActive: { color: '#c8a96e', borderBottom: '2px solid #c8a96e', background: 'rgba(200,169,110,0.05)' },
  alert: { borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 14, fontWeight: 500, border: '1px solid', marginTop: 20 },
  section: { padding: '28px 32px 36px' },
  empty: { textAlign: 'center', padding: '48px 0' },
  emptyText: { color: '#9ca3af', fontSize: 16, margin: '8px 0 4px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { color: '#9ca3af', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid rgba(200,169,110,0.1)' },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.04)' },
  td: { padding: '14px 12px', color: '#e5e7eb', fontSize: 14 },
  statusBadge: { borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 },
  infoBox: { background: 'rgba(200,169,110,0.07)', border: '1px solid rgba(200,169,110,0.2)', borderRadius: 12, padding: '16px 20px', marginBottom: 24 },
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { color: '#9ca3af', fontSize: 13, fontWeight: 500 },
  input: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(200,169,110,0.2)', borderRadius: 10, padding: '12px 16px', color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'inherit' },
  btn: { background: 'linear-gradient(135deg, #c8a96e, #a07840)', color: '#1a1a2e', border: 'none', borderRadius: 10, padding: '14px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' },
};
