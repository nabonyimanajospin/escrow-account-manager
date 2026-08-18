import { Link } from 'react-router-dom';

const Step = ({ done, title, desc, link, linkLabel }) => (
  <div className={`flex gap-3 p-3 rounded-xl border ${done ? 'bg-emerald-50/60 border-emerald-100' : 'bg-white border-slate-100'}`}>
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
      {done ? '✓' : '•'}
    </div>
    <div className="min-w-0 flex-1">
      <p className={`text-sm font-bold ${done ? 'text-emerald-800' : 'text-slate-800'}`}>{title}</p>
      <p className="text-xs text-slate-500 font-medium mt-0.5">{desc}</p>
      {!done && link && (
        <Link to={link} className="inline-block mt-2 text-xs font-bold text-primary-600 hover:text-primary-700">
          {linkLabel} →
        </Link>
      )}
    </div>
  </div>
);

export default function OnboardingChecklist({ user, walletBalance, hasActiveDeal, hasListedProperty }) {
  if (!user || user.role === 'ADMIN') return null;

  const kycDone = user.isKycVerified;
  const hasFunds = Number(walletBalance || 0) > 0;
  const isBuyer = user.role === 'BUYER';

  const steps = isBuyer
    ? [
        { done: kycDone, title: 'Verify your identity (KYC)', desc: 'One-time check required before you can buy or bid.', link: '/kyc', linkLabel: 'Complete KYC' },
        { done: hasFunds, title: 'Fund your wallet', desc: 'Deposits are paid from your platform wallet balance.', link: '/wallet', linkLabel: 'View wallet' },
        { done: hasActiveDeal, title: 'Start an escrow deal', desc: 'Browse listings and initiate a secure purchase.', link: '/properties', linkLabel: 'Browse properties' },
      ]
    : [
        { done: kycDone, title: 'Verify your identity (KYC)', desc: 'Required before listing or receiving escrow payouts.', link: '/kyc', linkLabel: 'Complete KYC' },
        { done: hasListedProperty, title: 'List a property', desc: 'Add your first listing to the marketplace.', link: '/properties/create', linkLabel: 'Create listing' },
        { done: hasActiveDeal, title: 'Manage an active deal', desc: 'Track buyer deposits and mutation progress.', link: '/dashboard', linkLabel: 'Open dashboard' },
      ];

  const completed = steps.filter((s) => s.done).length;
  if (completed === steps.length) return null;

  return (
    <div className="card p-5 bg-gradient-to-br from-primary-50 to-white border border-primary-100">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Getting started</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">{completed} of {steps.length} steps complete</p>
        </div>
        <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${(completed / steps.length) * 100}%` }} />
        </div>
      </div>
      <div className="space-y-2">{steps.map((step) => <Step key={step.title} {...step} />)}</div>
    </div>
  );
}
