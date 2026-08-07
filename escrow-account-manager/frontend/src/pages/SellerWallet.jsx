import React, { useState, useEffect } from 'react';
import axios from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import toast from 'react-hot-toast';
import EmptyState from '../components/common/EmptyState';
import { SkeletonCard, SkeletonTable } from '../components/common/SkeletonLoader';

export default function SellerWallet() {
  const { user } = useAuth();
  const isBuyer = user?.role === 'BUYER';
  const [wallet, setWallet] = useState(null);
  const [history, setHistory] = useState([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const [walletRes, historyRes] = await Promise.all([
        axios.get('/wallet'),
        axios.get('/wallet/history'),
      ]);
      setWallet(walletRes.data.wallet);
      setHistory(historyRes.data.transactions || []);
    } catch (err) {
      toast.error('Failed to load wallet data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWallet(); }, []);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error('Enter a valid withdrawal amount.');
      return;
    }
    setWithdrawing(true);
    try {
      const res = await axios.post('/wallet/withdraw', { amount: withdrawAmount, notes: withdrawNotes });
      toast.success(res.data.message);
      setWithdrawAmount('');
      setWithdrawNotes('');
      fetchWallet();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Withdrawal failed.');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper max-w-5xl mx-auto space-y-7 animate-fade-in">
        <div className="h-10 w-48 bg-slate-200 rounded animate-pulse mb-6"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="card bg-white mt-8">
           <SkeletonTable rows={5} columns={4} />
        </div>
      </div>
    );
  }

  const getTypeStyle = (type) => {
    switch (type) {
      case 'CREDIT': return { text: '+ Credit', color: 'text-emerald-600', icon: 'M7 11l5-5m0 0l5 5m-5-5v12' };
      case 'WITHDRAWAL_REQUEST': return { text: 'Withdrawal Request', color: 'text-amber-600', icon: 'M17 13l-5 5m0 0l-5-5m5 5V6' };
      case 'WITHDRAWAL_PAID': return { text: 'Withdrawal Paid', color: 'text-primary-600', icon: 'M5 13l4 4L19 7' };
      default: return { text: type, color: 'text-slate-600', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' };
    }
  };

  return (
    <div className="page-wrapper dashboard-wrapper space-y-7 animate-fade-in">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 font-sans">{isBuyer ? 'My Wallet' : 'Seller Wallet'}</h1>
          <p className="text-slate-500 text-sm font-semibold mt-1">
            {isBuyer ? 'Funds used for escrow deposits and refunds' : 'Manage your escrow earnings and withdrawals'}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Main Balance Card */}
        <div className="card p-6 bg-gradient-to-br from-primary-600 to-primary-800 text-white relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs font-bold text-primary-100 uppercase tracking-wider mb-2">Available Balance</p>
            <p className="text-4xl font-black">${Number(wallet?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-xs text-primary-200 mt-2 font-medium">{isBuyer ? 'Available for escrow deposits' : 'Ready for withdrawal'}</p>
          </div>
          {/* Decorative graphic */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl"></div>
        </div>

        <div className="card p-6 bg-white flex flex-col justify-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Earned</p>
          <p className="text-2xl font-extrabold text-emerald-600">${Number(wallet?.totalEarned || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 mt-2 font-medium">All-time settled revenue</p>
        </div>

        <div className="card p-6 bg-white flex flex-col justify-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pending Withdrawals</p>
          <p className="text-2xl font-extrabold text-amber-500">${Number(wallet?.pendingWithdrawals || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 mt-2 font-medium">Awaiting admin payout</p>
        </div>

        <div className="card p-6 bg-white flex flex-col justify-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Withdrawn</p>
          <p className="text-2xl font-extrabold text-slate-900">${Number(wallet?.totalWithdrawn || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 mt-2 font-medium">Paid out to your accounts</p>
        </div>
      </div>

      <div className="card bg-white overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/50">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'overview' ? 'text-primary-600 border-b-2 border-primary-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Transaction History
          </button>
          {!isBuyer && (
          <button 
            onClick={() => setActiveTab('withdraw')}
            className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'withdraw' ? 'text-primary-600 border-b-2 border-primary-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Request Withdrawal
          </button>
          )}
        </div>

        <div className="p-0">
          {activeTab === 'overview' && (
            <div>
              {history.length === 0 ? (
                <EmptyState
                  title="No Wallet Transactions"
                  description="Funds will appear here when an escrow is released to you."
                  icon={(
                    <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  )}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50/50">
                      <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Transaction Type</th>
                        <th className="px-6 py-4">Reference</th>
                        <th className="px-6 py-4 text-right">Amount</th>
                        <th className="px-6 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {history.map((tx) => {
                        const styleInfo = getTypeStyle(tx.type);
                        return (
                          <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-semibold text-slate-600 whitespace-nowrap">
                              {new Date(tx.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-md bg-slate-50 border border-slate-100 flex items-center justify-center ${styleInfo.color}`}>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={styleInfo.icon} /></svg>
                                </div>
                                <span className="text-sm font-bold text-slate-800">{styleInfo.text}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-mono text-slate-400">
                              {tx.reference || '—'}
                            </td>
                            <td className={`px-6 py-4 text-sm font-extrabold text-right whitespace-nowrap ${tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-slate-900'}`}>
                              {tx.type === 'CREDIT' ? '+' : '-'}${Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <StatusBadge status={tx.status} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'withdraw' && !isBuyer && (
            <div className="p-6 md:p-8 max-w-2xl">
              <div className="p-4 bg-primary-50 border border-primary-100 rounded-xl mb-6">
                <h4 className="text-xs font-bold text-primary-800 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  How Withdrawals Work
                </h4>
                <ul className="text-sm text-primary-700 font-medium space-y-1.5 ml-6 list-disc">
                  <li>Submit a request for any amount up to your available balance.</li>
                  <li>The amount is instantly locked and deducted from your available balance.</li>
                  <li>Platform Admins process payouts within 2-3 business days.</li>
                  <li>Payments are routed to your registered banking or mobile money details.</li>
                </ul>
              </div>

              <form onSubmit={handleWithdraw} className="space-y-6">
                <div className="space-y-2">
                  <label className="input-label">Withdrawal Amount (USD)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-400 font-bold sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      min="1"
                      max={wallet?.balance || 0}
                      step="0.01"
                      required
                      className="input-field pl-7 font-bold text-lg"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      disabled={withdrawing || !wallet?.balance}
                    />
                  </div>
                  <p className="text-xs text-slate-500 font-semibold text-right">
                    Available: <span className="text-slate-900 font-bold">${Number(wallet?.balance || 0).toLocaleString()}</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="input-label">Payout Instructions & Notes</label>
                  <textarea
                    className="input-field min-h-[100px] resize-y"
                    placeholder="E.g., MTN Mobile Money: 0788123456 or Bank: EQUITY BANK / ACC: 1234567"
                    value={withdrawNotes}
                    onChange={(e) => setWithdrawNotes(e.target.value)}
                    disabled={withdrawing}
                    required
                  />
                  <p className="text-[10px] text-slate-400 font-semibold">Please ensure these details are perfectly accurate to avoid delays.</p>
                </div>

                <button 
                  type="submit" 
                  className="btn-primary w-full sm:w-auto px-8" 
                  disabled={withdrawing || !wallet?.balance || !withdrawAmount}
                >
                  {withdrawing ? 'Processing Request...' : 'Submit Withdrawal Request'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
