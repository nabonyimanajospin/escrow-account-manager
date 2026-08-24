import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DEMO_PROPERTIES } from '../data/demoData';
import { useAuth } from '../context/AuthContext';
import { useDeals } from '../context/DealContext';
import { calculatePlatformFees, formatMoney, getRoleAwarePrice } from '../utils/fees';
import ContractPreviewModal from '../components/ContractPreviewModal';

export default function PropertyDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { startDeal } = useDeals();
  const navigate = useNavigate();
  const [showContract, setShowContract] = useState(false);
  const [bidPrice, setBidPrice] = useState('');
  const [bidDays, setBidDays] = useState('15');
  const property = DEMO_PROPERTIES.find((p) => String(p.id) === String(id));

  if (!property) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="font-bold">Property not found</p>
        <Link to="/properties" className="text-primary-600 underline">
          Back
        </Link>
      </div>
    );
  }

  const display = getRoleAwarePrice(property.price, user?.role);
  const fees = calculatePlatformFees(property.price);

  const beginDeal = (offerPrice, bidNote) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'BUYER') {
      alert('Switch to Buyer demo login to start an escrow purchase.');
      return;
    }
    const deal = startDeal(property.id, { offerPrice, bidNote });
    if (deal) navigate(`/escrow/${deal.id}`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link to="/properties" className="text-sm font-bold text-slate-500 hover:text-slate-900">
        ← Back to listings
      </Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="card overflow-hidden">
            <img src={property.image} alt={property.title} className="h-80 w-full object-cover" />
          </div>
          <div className="card p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">{property.propertyType}</p>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{property.title}</h1>
            <p className="text-xs font-bold uppercase text-slate-400">{property.location}</p>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">{property.description}</p>
            <p className="mt-3 font-mono text-xs text-slate-500">UPI: {property.upiCode}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="card space-y-4 p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{display.label}</p>
              <p className="mt-1 text-3xl font-extrabold text-slate-900">${formatMoney(display.amount)}</p>
              <p className="mt-1 text-[10px] text-slate-500">{display.hint}</p>
            </div>
            {user?.role === 'BUYER' && (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900">
                <p className="font-bold uppercase tracking-wider text-[10px]">What you pay at deposit</p>
                <p className="mt-1 flex justify-between">
                  <span>Listing</span>
                  <span>${formatMoney(fees.price)}</span>
                </p>
                <p className="flex justify-between text-indigo-700">
                  <span>+ 1% fee</span>
                  <span>${formatMoney(fees.buyerFee)}</span>
                </p>
                <p className="mt-1 flex justify-between border-t border-indigo-200 pt-1 font-extrabold">
                  <span>Total</span>
                  <span>${formatMoney(fees.buyerTotal)}</span>
                </p>
              </div>
            )}
            {user?.role === 'SELLER' && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                <p className="font-bold uppercase tracking-wider text-[10px]">Your expected payout</p>
                <p className="mt-1 flex justify-between">
                  <span>Listing</span>
                  <span>${formatMoney(fees.price)}</span>
                </p>
                <p className="flex justify-between text-emerald-700">
                  <span>− 1.5% fee</span>
                  <span>${formatMoney(fees.sellerFee)}</span>
                </p>
                <p className="mt-1 flex justify-between border-t border-emerald-200 pt-1 font-extrabold">
                  <span>Net</span>
                  <span>${formatMoney(fees.sellerNetPayout)}</span>
                </p>
              </div>
            )}

            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => beginDeal(property.price)}
            >
              {user?.role === 'BUYER' ? 'Buy now & start escrow' : 'Start escrow (as Buyer)'}
            </button>
            <button type="button" className="btn-secondary w-full" onClick={() => setShowContract(true)}>
              Preview contract + QR
            </button>

            <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <summary className="cursor-pointer text-xs font-bold text-primary-700">
                Place a bargain offer (demo)
              </summary>
              <div className="mt-3 space-y-2">
                <input
                  type="number"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder={`Min $${property.price.toLocaleString()}`}
                  value={bidPrice}
                  onChange={(e) => setBidPrice(e.target.value)}
                />
                <input
                  type="number"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Settlement days"
                  value={bidDays}
                  onChange={(e) => setBidDays(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-primary w-full !py-2 text-xs"
                  onClick={() => {
                    const offer = Number(bidPrice) || property.price;
                    beginDeal(offer, `Offer $${offer.toLocaleString()} · ${bidDays || 15} days`);
                  }}
                >
                  Submit offer & open escrow
                </button>
                <p className="text-[10px] text-slate-500">
                  In the full product, sellers rank offers with AI. Here an offer opens a deal at that price.
                </p>
              </div>
            </details>

            {!user && (
              <Link to="/login" className="text-center text-xs font-bold text-primary-600 underline">
                Demo login first for the full flow
              </Link>
            )}
          </div>
          {user?.role === 'ADMIN' && (
            <Link to="/admin" className="card block p-5 text-xs hover:border-violet-300">
              <p className="font-extrabold uppercase tracking-wider text-violet-800">Admin panel →</p>
              <p className="mt-1 text-slate-500">Review deals awaiting release</p>
            </Link>
          )}
        </div>
      </div>
      {showContract && <ContractPreviewModal property={property} onClose={() => setShowContract(false)} />}
    </div>
  );
}
