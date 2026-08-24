import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';

const FEATURES = [
  { title: 'Full escrow timeline', desc: 'OTP → fund → mutation docs → admin release or refund' },
  { title: 'Role-aware pricing', desc: 'Buyers see deposit total; sellers see net payout' },
  { title: 'AI Co-Pilot', desc: 'Chat + Ask AI on contract clauses' },
  { title: 'QR verification', desc: 'Public checksum page for certificate authenticity' },
  { title: 'Activity journal', desc: 'Debit/credit style log of every demo step' },
  { title: 'Admin audit queue', desc: 'Checklist review before releasing custody funds' },
];

export default function Landing() {
  return (
    <div>
      <div className="hero-mesh border-b border-slate-200/60 pb-16 pt-14">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 text-center">
          <BrandLogo variant="icon" imgClassName="h-20 w-auto drop-shadow-md" />
          <BrandLogo variant="wordmark" imgClassName="mt-3 h-8 w-auto" />
          <h1 className="mt-8 font-display text-4xl font-black tracking-tight text-slate-900 sm:text-6xl">
            Real Estate Transactions,{' '}
            <span className="text-primary-600">Without the Risk.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-medium text-slate-500">
            Interactive prototype: walk a property deal from listing to funded escrow to admin release — with AI
            guidance and transparent fees.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/login" className="btn-primary px-8 py-3.5">
              Start guided demo
            </Link>
            <Link to="/properties" className="btn-secondary px-8 py-3.5">
              Browse listings
            </Link>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-extrabold text-slate-900">What reviewers can try</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-500">
          Switch Buyer → Seller → Admin in demo login to complete one full deal in under 5 minutes.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-5">
              <h3 className="font-extrabold text-slate-900">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="card mt-10 border-primary-200 bg-primary-50 p-6 text-center">
          <p className="text-sm font-bold text-primary-900">Suggested walkthrough</p>
          <p className="mt-2 text-sm text-primary-800">
            Login as <strong>Buyer</strong> → Buy now → OTP <code className="rounded bg-white px-1">123456</code> →
            switch to <strong>Seller</strong> → OTP → switch to Buyer → Fund → Seller upload → Admin release
          </p>
        </div>
      </section>
    </div>
  );
}
