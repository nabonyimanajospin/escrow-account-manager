import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDeals } from '../context/DealContext';
import { formatMoney } from '../utils/fees';

export default function AdminPanel() {
  const { user } = useAuth();
  const { deals } = useDeals();

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="font-bold">Admin demo login required</p>
        <Link to="/login" className="btn-primary mt-4 inline-flex">
          Demo login
        </Link>
      </div>
    );
  }

  const queue = deals.filter((d) => d.status === 'UNDER_REVIEW');
  const funded = deals.filter((d) => ['FUNDED', 'MUTATION_UPLOADED'].includes(d.status));

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Admin Panel</h1>
        <p className="text-sm text-slate-500">Demo audit console — release or refund after document review.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-[10px] font-bold uppercase text-violet-500">In review queue</p>
          <p className="text-3xl font-extrabold text-violet-700">{queue.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-[10px] font-bold uppercase text-blue-500">Funded / mutation</p>
          <p className="text-3xl font-extrabold text-blue-700">{funded.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-[10px] font-bold uppercase text-emerald-500">Completed</p>
          <p className="text-3xl font-extrabold text-emerald-700">
            {deals.filter((d) => d.status === 'COMPLETED').length}
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-violet-100 bg-violet-50 px-5 py-3">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-violet-900">
            Checklist audit — awaiting decision
          </h2>
        </div>
        {queue.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No deals in review. Advance a deal as Buyer → Seller until “Submit for admin review”.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {queue.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-bold text-slate-900">{d.propertyTitle}</p>
                  <p className="text-xs text-slate-500">
                    Custody ${formatMoney(d.buyerTotal)} · Doc: {d.mutationDoc?.name || '—'}
                  </p>
                </div>
                <Link to={`/escrow/${d.id}`} className="btn-primary !py-2 text-xs">
                  Open audit
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <p className="font-bold text-slate-800">Simulations (demo)</p>
        <p className="mt-1">
          Irembo certificate upload and MoMo-style funding are simulated in the deal workspace — same story as the
          full product’s admin simulations, without live APIs.
        </p>
      </div>
    </div>
  );
}
