import { Link, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDeals } from '../context/DealContext';
import { formatMoney } from '../utils/fees';
import ContractPreviewModal from '../components/ContractPreviewModal';

const STATUS_LABEL = {
  PENDING: 'Awaiting OTP',
  OTP_DONE: 'Ready to fund',
  FUNDED: 'Funds locked',
  MUTATION_UPLOADED: 'Docs uploaded',
  UNDER_REVIEW: 'Admin review',
  COMPLETED: 'Completed',
  REFUNDED: 'Refunded',
};

const TIMELINE = [
  { key: 'PENDING', title: 'Create deal' },
  { key: 'OTP_DONE', title: 'Dual OTP' },
  { key: 'FUNDED', title: 'Fund escrow' },
  { key: 'MUTATION_UPLOADED', title: 'Mutation docs' },
  { key: 'UNDER_REVIEW', title: 'Admin audit' },
  { key: 'COMPLETED', title: 'Release / done' },
];

function statusIndex(status) {
  if (status === 'REFUNDED') return 5;
  const i = TIMELINE.findIndex((t) => t.key === status);
  return i < 0 ? 0 : i;
}

export default function EscrowDeal() {
  const { id } = useParams();
  const { user } = useAuth();
  const { getDeal, confirmOtp, fundEscrow, uploadMutation, submitForReview, releaseFunds, refundBuyer } =
    useDeals();
  const deal = getDeal(id);
  const navigate = useNavigate();
  const [otpInput, setOtpInput] = useState('');
  const [notes, setNotes] = useState('');
  const [showContract, setShowContract] = useState(false);
  const [toast, setToast] = useState('');

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  if (!deal) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="font-bold">Deal not found</p>
        <Link to="/dashboard" className="text-primary-600 underline">
          Dashboard
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="font-bold">Demo-login required to act on this deal</p>
        <Link to="/login" className="btn-primary mt-4 inline-flex">
          Demo login
        </Link>
      </div>
    );
  }

  const step = statusIndex(deal.status);
  const propertyLike = {
    id: deal.propertyId,
    title: deal.propertyTitle,
    location: deal.location,
    upiCode: deal.upiCode,
    price: deal.amount,
  };

  const handleOtp = () => {
    if (otpInput.trim() !== '123456') {
      flash('Use demo OTP: 123456');
      return;
    }
    confirmOtp(deal.id, user.role);
    setOtpInput('');
    flash(`${user.role} OTP verified`);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      {toast && (
        <div className="fixed right-4 top-20 z-50 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/dashboard" className="text-sm font-bold text-slate-500 hover:text-slate-900">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900">{deal.propertyTitle}</h1>
          <p className="font-mono text-xs text-slate-400">{deal.id}</p>
        </div>
        <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-extrabold uppercase text-primary-800">
          {STATUS_LABEL[deal.status] || deal.status}
        </span>
      </div>

      {/* Timeline */}
      <div className="card p-5">
        <p className="mb-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Escrow timeline</p>
        <div className="flex flex-wrap gap-2">
          {TIMELINE.map((t, i) => {
            const done = deal.status === 'REFUNDED' ? i <= 4 : i <= step;
            const current = deal.status !== 'REFUNDED' && i === step;
            return (
              <div
                key={t.key}
                className={`rounded-lg px-3 py-2 text-[11px] font-bold ${
                  current
                    ? 'bg-primary-600 text-white'
                    : done
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {i + 1}. {t.title}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Money summary */}
          <div className="card grid gap-3 p-5 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Listing</p>
              <p className="text-lg font-extrabold">${formatMoney(deal.amount)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-indigo-500">Buyer deposits</p>
              <p className="text-lg font-extrabold text-indigo-700">${formatMoney(deal.buyerTotal)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-emerald-500">Seller net</p>
              <p className="text-lg font-extrabold text-emerald-700">${formatMoney(deal.sellerNet)}</p>
            </div>
          </div>

          {/* Role actions */}
          <div className="card space-y-4 p-5">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
              Your actions · {user.role}
            </h2>

            {/* OTP */}
            {(deal.status === 'PENDING' || (!deal.buyerOtpOk && user.role === 'BUYER') || (!deal.sellerOtpOk && user.role === 'SELLER')) &&
              deal.status === 'PENDING' &&
              (user.role === 'BUYER' || user.role === 'SELLER') && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-bold text-amber-900">Dual OTP consensus</p>
                  <p className="mt-1 text-xs text-amber-800">
                    Both parties must enter the demo code. Buyer OTP:{' '}
                    {deal.buyerOtpOk ? '✓' : '…'} · Seller OTP: {deal.sellerOtpOk ? '✓' : '…'}
                  </p>
                  {((user.role === 'BUYER' && !deal.buyerOtpOk) ||
                    (user.role === 'SELLER' && !deal.sellerOtpOk)) && (
                    <div className="mt-3 flex gap-2">
                      <input
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                        placeholder="Demo OTP: 123456"
                        className="flex-1 rounded-lg border border-amber-300 px-3 py-2 text-sm font-mono"
                      />
                      <button type="button" className="btn-primary" onClick={handleOtp}>
                        Verify
                      </button>
                    </div>
                  )}
                  <p className="mt-2 text-[10px] text-amber-700">Tip: switch login to the other role to complete dual OTP.</p>
                </div>
              )}

            {/* Buyer fund */}
            {user.role === 'BUYER' && deal.status === 'OTP_DONE' && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                <p className="text-xs font-bold text-indigo-900">Lock funds in escrow</p>
                <p className="mt-1 text-xs text-indigo-800">
                  Debit your demo wallet for <strong>${formatMoney(deal.buyerTotal)}</strong> (price + 1%).
                </p>
                <button
                  type="button"
                  className="btn-primary mt-3"
                  onClick={() => {
                    fundEscrow(deal.id);
                    flash('Escrow funded — funds locked');
                  }}
                >
                  Confirm escrow deposit
                </button>
              </div>
            )}

            {/* Seller upload */}
            {user.role === 'SELLER' && deal.status === 'FUNDED' && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-bold text-emerald-900">Upload mutation / deed proof</p>
                <p className="mt-1 text-xs text-emerald-800">Simulate Irembo / RLMA certificate upload.</p>
                <button
                  type="button"
                  className="btn-primary mt-3"
                  onClick={() => {
                    uploadMutation(deal.id, `CERT-NLA-SIM-${Date.now()}.pdf`);
                    flash('Mutation document attached');
                  }}
                >
                  Simulate Irembo upload
                </button>
              </div>
            )}

            {user.role === 'SELLER' && deal.status === 'MUTATION_UPLOADED' && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  submitForReview(deal.id);
                  flash('Sent to admin review');
                }}
              >
                Submit for admin review
              </button>
            )}

            {/* Admin */}
            {user.role === 'ADMIN' && deal.status === 'UNDER_REVIEW' && (
              <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50 p-4">
                <p className="text-xs font-extrabold uppercase text-violet-900">Administrative audit</p>
                <ul className="space-y-1 text-xs text-violet-800">
                  <li>✓ Government registry verified (simulated)</li>
                  <li>✓ Mutation documents present</li>
                  <li>✓ Ledger custody funded (${formatMoney(deal.buyerTotal)})</li>
                </ul>
                {deal.mutationDoc && (
                  <p className="rounded-lg bg-white/80 px-3 py-2 font-mono text-[10px] text-slate-600">
                    {deal.mutationDoc.name}
                  </p>
                )}
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Audit notes..."
                  className="w-full rounded-lg border border-violet-200 px-3 py-2 text-sm"
                  rows={2}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      releaseFunds(deal.id, notes);
                      flash('Funds released to seller');
                    }}
                  >
                    Approve & release
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      refundBuyer(deal.id, notes);
                      flash('Buyer refunded');
                    }}
                  >
                    Reject & refund
                  </button>
                </div>
              </div>
            )}

            {deal.status === 'COMPLETED' && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
                <p className="font-extrabold">Deal completed</p>
                <p className="mt-1 text-xs">
                  Seller received ${formatMoney(deal.sellerNet)}. Platform earned $
                  {formatMoney(deal.buyerFee + deal.sellerFee)}. Certificate / QR available in contract preview.
                </p>
              </div>
            )}

            {deal.status === 'REFUNDED' && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-extrabold">Buyer refunded</p>
                <p className="mt-1 text-xs">Escrow returned ${formatMoney(deal.buyerTotal)} to buyer wallet (demo).</p>
              </div>
            )}

            {(user.role === 'BUYER' && deal.status === 'PENDING' && deal.buyerOtpOk) ||
            (user.role === 'SELLER' && deal.status === 'PENDING' && deal.sellerOtpOk) ? (
              <p className="text-xs text-slate-500">Waiting for the other party’s OTP — switch role via Demo login.</p>
            ) : null}

            {user.role === 'BUYER' && deal.status === 'FUNDED' && (
              <p className="text-xs text-slate-500">Waiting for seller to upload mutation documents…</p>
            )}
            {user.role === 'ADMIN' && deal.status !== 'UNDER_REVIEW' && deal.status !== 'COMPLETED' && deal.status !== 'REFUNDED' && (
              <p className="text-xs text-slate-500">
                No action yet — deal must reach <strong>Admin review</strong>. Switch roles to advance the demo.
              </p>
            )}
          </div>

          {/* Journal */}
          <div className="card overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Double-entry style activity log
              </h3>
            </div>
            <ul className="divide-y divide-slate-100">
              {[...deal.journal].reverse().map((j) => (
                <li key={j.id} className="flex gap-3 px-5 py-3 text-xs">
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                      j.type === 'DEBIT'
                        ? 'bg-rose-100 text-rose-700'
                        : j.type === 'CREDIT'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {j.type}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-800">{j.text}</p>
                    <p className="text-[10px] text-slate-400">{new Date(j.at).toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card overflow-hidden">
            <img src={deal.image} alt="" className="h-36 w-full object-cover" />
            <div className="p-4 text-xs text-slate-500">
              <p className="font-bold text-slate-800">{deal.location}</p>
              <p className="mt-1 font-mono">UPI {deal.upiCode}</p>
            </div>
          </div>
          <button type="button" className="btn-primary w-full" onClick={() => setShowContract(true)}>
            Contract preview + QR
          </button>
          <button type="button" className="btn-secondary w-full" onClick={() => navigate('/login')}>
            Switch demo role
          </button>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[11px] leading-relaxed text-slate-600">
            <p className="font-bold text-slate-800">How to wow reviewers</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              <li>Buyer: start deal → OTP 123456</li>
              <li>Seller: OTP 123456</li>
              <li>Buyer: fund escrow</li>
              <li>Seller: upload → submit review</li>
              <li>Admin: release or refund</li>
            </ol>
          </div>
        </div>
      </div>

      {showContract && (
        <ContractPreviewModal
          property={propertyLike}
          deal={deal}
          onClose={() => setShowContract(false)}
        />
      )}
    </div>
  );
}
