import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';

const ROLES = [
  { key: 'BUYER', title: 'Continue as Buyer', desc: 'See deposit totals (+1% fee) and wallet' },
  { key: 'SELLER', title: 'Continue as Seller', desc: 'See listing price and net payout (−1.5%)' },
  { key: 'ADMIN', title: 'Continue as Admin', desc: 'See audit checklist overview' },
];

export default function Login() {
  const { loginAs } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="card p-8">
        <div className="mb-6 flex justify-center">
          <BrandLogo variant="primary" imgClassName="h-12 w-auto" />
        </div>
        <h1 className="text-center text-2xl font-extrabold text-slate-900">Demo login</h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          No passwords. Local demo session only — nothing is saved to a server.
        </p>
        <div className="mt-8 space-y-3">
          {ROLES.map((r) => (
            <button
              key={r.key}
              type="button"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left hover:border-primary-400 hover:bg-primary-50"
              onClick={() => {
                loginAs(r.key);
                navigate('/properties');
              }}
            >
              <p className="font-bold text-slate-900">{r.title}</p>
              <p className="text-xs text-slate-500">{r.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
