import { Link } from 'react-router-dom';
import { DEMO_PROPERTIES } from '../data/demoData';
import { useAuth } from '../context/AuthContext';
import { getRoleAwarePrice, formatMoney } from '../utils/fees';

export default function Properties() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900">Browse properties</h1>
      <p className="mt-1 text-sm text-slate-500">
        Prices change by role: buyers see total deposit; sellers see listing + net.
      </p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {DEMO_PROPERTIES.map((p) => {
          const display = getRoleAwarePrice(p.price, user?.role);
          return (
            <Link
              key={p.id}
              to={`/properties/${p.id}`}
              className="card overflow-hidden transition hover:-translate-y-0.5"
            >
              <div className="relative h-44 bg-slate-100">
                <img src={p.image} alt={p.title} className="h-full w-full object-cover" />
                <div className="absolute bottom-3 left-3 rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-1 text-sm font-extrabold text-white">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-300">
                    {display.label}
                  </span>
                  ${formatMoney(display.amount)}
                </div>
              </div>
              <div className="p-4">
                <h2 className="font-bold text-slate-900">{p.title}</h2>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{p.location}</p>
                <p className="mt-2 line-clamp-2 text-xs text-slate-500">{p.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
