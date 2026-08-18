import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axiosConfig';
import toast from 'react-hot-toast';
import { SkeletonCard } from '../components/common/SkeletonLoader';

const fmt = (n) =>
  `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdminPlatformWallet() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get('/admin/platform-summary')
      .then((res) => setSummary(res.data.data))
      .catch(() => toast.error('Failed to load platform treasury summary'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-wrapper dashboard-wrapper space-y-7 animate-fade-in">
        <div className="h-10 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper dashboard-wrapper space-y-7 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 font-sans">Platform Treasury</h1>
        <p className="text-slate-500 text-sm font-semibold mt-1">
          System-wide balances — escrow custody, platform fees, and user wallets
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="wallet-balance-card p-6 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs font-bold text-white/90 uppercase tracking-wider mb-2">Escrow Locked</p>
            <p className="text-3xl font-black text-white">{fmt(summary?.totalEscrowLocked)}</p>
            <p className="text-xs text-white/80 mt-2">{summary?.activeEscrowAccounts || 0} active custody accounts</p>
          </div>
        </div>

        <div className="card p-6 bg-white">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Platform Revenue</p>
          <p className="text-3xl font-black text-emerald-600">{fmt(summary?.platformRevenue)}</p>
          <p className="text-xs text-slate-400 mt-2">Fees earned (buyer + seller)</p>
        </div>

        <div className="card p-6 bg-white">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">All User Wallets</p>
          <p className="text-3xl font-black text-slate-900">{fmt(summary?.totalUserWalletBalances)}</p>
          <p className="text-xs text-slate-400 mt-2">Buyer + seller wallet balances combined</p>
        </div>

        <div className="card p-6 bg-white">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Completed Deals</p>
          <p className="text-3xl font-black text-blue-600">{summary?.completedDeals || 0}</p>
          <p className="text-xs text-slate-400 mt-2">Successfully closed escrows</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6 bg-white">
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4">Pending admin actions</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg bg-amber-50 border border-amber-100">
              <span className="text-sm font-semibold text-amber-900">Wallet deposit requests</span>
              <span className="text-sm font-black text-amber-800">
                {summary?.pendingDepositCount || 0} · {fmt(summary?.pendingDepositAmount)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-purple-50 border border-purple-100">
              <span className="text-sm font-semibold text-purple-900">Seller withdrawal requests</span>
              <span className="text-sm font-black text-purple-800">
                {summary?.pendingWithdrawalCount || 0} · {fmt(summary?.pendingWithdrawalAmount)}
              </span>
            </div>
          </div>
          <Link to="/admin" className="btn-primary text-xs mt-4 inline-flex">
            Open Admin Panel → Wallet tab
          </Link>
        </div>

        <div className="card p-6 bg-slate-900 text-white">
          <h2 className="text-sm font-extrabold uppercase tracking-wider mb-3 text-emerald-300">Demo simulations (MoMo & Irembo)</h2>
          <p className="text-sm text-slate-300 leading-relaxed mb-4">
            Payment and land-registry simulations are <strong className="text-white">not on this page</strong>.
            They live in the <strong className="text-white">Admin Panel → Transactions</strong> tab, on each deal row:
          </p>
          <ul className="text-sm text-slate-300 space-y-2 ml-4 list-disc mb-5">
            <li><strong className="text-amber-300">⚡ Simulate MoMo Deposit</strong> — when deal status is <code className="text-xs bg-slate-800 px-1 rounded">PENDING</code></li>
            <li><strong className="text-blue-300">⚡ Simulate Irembo Approval</strong> — when status is <code className="text-xs bg-slate-800 px-1 rounded">FUNDED</code> or <code className="text-xs bg-slate-800 px-1 rounded">MUTATION_STARTED</code></li>
          </ul>
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 bg-white text-slate-900 text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Go to Transactions & simulations →
          </Link>
        </div>
      </div>

      <div className="card p-5 bg-blue-50 border border-blue-100">
        <p className="text-xs text-blue-800 font-medium leading-relaxed">
          <strong className="font-bold">Note:</strong> Buyer wallet funding (real MoMo/bank references) is approved under{' '}
          <strong>Admin Panel → Wallet</strong>. Deal-level MoMo deposit simulation skips external payment and funds escrow directly for demos.
          Full ledger detail is in <Link to="/dashboard" className="font-bold underline">Dashboard → Platform Accounting Journal</Link>.
        </p>
      </div>
    </div>
  );
}
