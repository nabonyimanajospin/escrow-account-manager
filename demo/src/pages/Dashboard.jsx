import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDeals } from '../context/DealContext';
import { formatMoney } from '../utils/fees';

export default function Dashboard() {
  const { user } = useAuth();
  const { deals, resetDemo } = useDeals();

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="font-bold">Demo-login to see your deals</p>
        <Link to="/login" className="btn-primary mt-4 inline-flex">
          Demo login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Signed in as <strong>{user.name}</strong> ({user.role}) — deals persist in this browser tab.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/properties" className="btn-primary text-sm">
            Browse & start deal
          </Link>
          <button type="button" className="btn-secondary text-sm" onClick={resetDemo}>
            Reset demo data
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-[10px] font-bold uppercase text-slate-400">Active / open deals</p>
          <p className="text-3xl font-extrabold text-slate-900">
            {deals.filter((d) => !['COMPLETED', 'REFUNDED'].includes(d.status)).length}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-[10px] font-bold uppercase text-slate-400">Completed</p>
          <p className="text-3xl font-extrabold text-emerald-600">
            {deals.filter((d) => d.status === 'COMPLETED').length}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-[10px] font-bold uppercase text-slate-400">Wallet (demo)</p>
          <p className="text-3xl font-extrabold text-primary-600">${formatMoney(user.wallet)}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Your escrow deals</h2>
        </div>
        {deals.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No deals yet.{' '}
            <Link to="/properties" className="font-bold text-primary-600 underline">
              Start one from a listing
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {deals.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-bold text-slate-900">{d.propertyTitle}</p>
                  <p className="font-mono text-[10px] text-slate-400">{d.id}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Buyer pays ${formatMoney(d.buyerTotal)} · Seller net ${formatMoney(d.sellerNet)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase text-slate-700">
                    {d.status.replace(/_/g, ' ')}
                  </span>
                  <Link to={`/escrow/${d.id}`} className="btn-primary !py-2 !px-3 text-xs">
                    Open deal
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {user.role === 'ADMIN' && (
        <Link
          to="/admin"
          className="card block border-violet-200 bg-violet-50 p-5 transition hover:border-violet-400"
        >
          <p className="font-extrabold text-violet-900">Admin audit console →</p>
          <p className="text-xs text-violet-700">Review deals waiting for release or refund</p>
        </Link>
      )}
    </div>
  );
}
