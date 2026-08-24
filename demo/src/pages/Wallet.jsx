import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../utils/fees';

export default function Wallet() {
  const { user } = useAuth();
  const [ref, setRef] = useState('');
  const [amount, setAmount] = useState('');
  const [requests, setRequests] = useState([]);

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="font-bold">Please demo-login first</p>
        <Link to="/login" className="text-primary-600 underline">
          Demo login
        </Link>
      </div>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    if (!amount || !ref.trim()) return;
    setRequests((r) => [
      {
        id: Date.now(),
        amount: Number(amount),
        ref: ref.trim(),
        status: 'PENDING_ADMIN',
        at: new Date().toISOString(),
      },
      ...r,
    ]);
    setAmount('');
    setRef('');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">
          {user.role === 'BUYER' ? 'My Wallet' : user.role === 'SELLER' ? 'Seller Wallet' : 'Platform Treasury'}
        </h1>
        <p className="text-sm text-slate-500">Mock balances — funding requests stay local in this demo.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="wallet-balance-card p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-white/90">Available Balance</p>
          <p className="mt-1 text-4xl font-black text-white">${formatMoney(user.wallet)}</p>
          <p className="mt-2 text-xs text-white/80">
            {user.role === 'BUYER' ? 'Available for escrow deposits' : 'Demo wallet'}
          </p>
        </div>
        <div className="card flex flex-col justify-center p-6">
          <p className="text-xs font-bold uppercase text-slate-400">Pending requests</p>
          <p className="text-2xl font-extrabold text-amber-500">{requests.length}</p>
        </div>
        <div className="card flex flex-col justify-center p-6">
          <p className="text-xs font-bold uppercase text-slate-400">Escrow tip</p>
          <p className="text-sm font-semibold text-slate-700">Fund wallet → then lock escrow on a deal</p>
        </div>
      </div>

      {user.role === 'BUYER' && (
        <div className="card p-6">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">Add funds (demo)</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>Pay via MoMo / Airtel / bank (outside the app in production).</li>
            <li>Paste the payment reference you receive after paying.</li>
            <li>Admin verifies the reference before crediting (shown as pending here).</li>
          </ol>
          <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-3">
            <input
              type="number"
              required
              placeholder="Amount USD"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <input
              required
              placeholder="Payment reference / Txn ID"
              className="rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm sm:col-span-1"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
            />
            <button type="submit" className="btn-primary">
              Submit request
            </button>
          </form>
          {requests.length > 0 && (
            <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100">
              {requests.map((r) => (
                <li key={r.id} className="flex justify-between px-4 py-3 text-xs">
                  <span>
                    ${formatMoney(r.amount)} · <span className="font-mono">{r.ref}</span>
                  </span>
                  <span className="font-bold text-amber-600">{r.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
