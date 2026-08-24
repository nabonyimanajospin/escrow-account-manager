import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import BrandLogo from './BrandLogo';
import { calculatePlatformFees, formatMoney } from '../utils/fees';

export default function ContractPreviewModal({ property, deal, onClose }) {
  const fees = calculatePlatformFees(property.price);
  const checksum = deal?.id
    ? `CHK-ESCROW-${deal.id}`
    : `CHK-ESCROW-DEMO-${property.id}`;
  const verifyUrl = `${window.location.origin}/verify/${encodeURIComponent(checksum)}`;
  const finalized = deal?.status === 'COMPLETED';
  const [aiTip, setAiTip] = useState(null);

  const explain = (clause) => {
    const tips = {
      1: '**Clause 1** names the parties, property, UPI, and agreed price — the legal subject of the escrow.',
      2: `**Clause 2** is custody: the buyer must deposit **$${formatMoney(fees.buyerTotal)}** (listing + 1% fee). Funds stay locked until mutation is verified.`,
      3: `**Clause 3** is payout: seller gets **$${formatMoney(fees.sellerNetPayout)}** after 1.5% fee. Disputes can freeze release.`,
      4: '**Clause 4** (demo) covers dual OTP consensus — both sides must authorize before funding.',
    };
    setAiTip(tips[clause]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-5 py-4 text-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              {finalized ? 'Final certificate preview' : 'Draft contract preview'}
            </p>
            <h2 className="text-lg font-black">Property Escrow Agreement</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg bg-slate-800 px-3 py-2 text-sm">
            Close
          </button>
        </div>
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-[11px] text-amber-900">
          Tip: click <strong>Ask AI</strong> on any clause for a plain-language explanation (demo).
        </div>
        <div className="space-y-4 overflow-y-auto p-6">
          {aiTip && (
            <div className="rounded-xl border border-indigo-700 bg-indigo-950 p-4 text-sm text-indigo-50">
              <div className="mb-2 flex justify-between text-[10px] font-bold uppercase tracking-wider text-amber-400">
                <span>AI Co-Pilot explain</span>
                <button type="button" onClick={() => setAiTip(null)} className="text-indigo-300">
                  Close ×
                </button>
              </div>
              <p className="leading-relaxed" dangerouslySetInnerHTML={{ __html: aiTip.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            </div>
          )}
          <div className="flex justify-center">
            <BrandLogo variant="primary" imgClassName="h-12 w-auto" />
          </div>
          <div
            className={`rounded-xl border-4 bg-slate-50 p-5 text-sm leading-relaxed ${
              finalized ? 'border-slate-900' : 'border-amber-600'
            }`}
          >
            <p className="mb-3 text-center text-xs font-black uppercase tracking-widest text-slate-800">
              EscrowTrust · {finalized ? 'Completion Certificate' : 'Demo Certificate Preview'}
            </p>
            {[
              {
                n: 1,
                body: (
                  <>
                    <strong>Clause 1:</strong> Buyer and Seller agree to transfer <strong>{property.title}</strong> (
                    {property.location}) UPI <strong>{property.upiCode}</strong> for{' '}
                    <strong>${formatMoney(fees.price)}</strong>.
                  </>
                ),
              },
              {
                n: 2,
                body: (
                  <>
                    <strong>Clause 2:</strong> Buyer deposits <strong>${formatMoney(fees.buyerTotal)}</strong> (price +
                    1% fee of ${formatMoney(fees.buyerFee)}) into escrow custody.
                  </>
                ),
              },
              {
                n: 3,
                body: (
                  <>
                    <strong>Clause 3:</strong> On completion, seller receives{' '}
                    <strong>${formatMoney(fees.sellerNetPayout)}</strong> after 1.5% platform fee ($
                    {formatMoney(fees.sellerFee)}).
                  </>
                ),
              },
              {
                n: 4,
                body: (
                  <>
                    <strong>Clause 4:</strong> Dual OTP cryptographic consensus is required before funds may leave the
                    buyer wallet into escrow.
                  </>
                ),
              },
            ].map((c) => (
              <div key={c.n} className="group relative mt-3 rounded-lg p-2 hover:bg-amber-100/40">
                <p>{c.body}</p>
                <button
                  type="button"
                  onClick={() => explain(c.n)}
                  className="mt-1 text-[10px] font-extrabold text-indigo-600 hover:underline"
                >
                  ✨ Ask AI to explain
                </button>
              </div>
            ))}
            <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-slate-300 pt-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-slate-300 bg-white p-2">
                  <QRCodeSVG value={verifyUrl} size={88} level="M" />
                </div>
                <div>
                  <p className="text-[11px] font-extrabold uppercase text-slate-900">Scan to verify</p>
                  <p className="max-w-[200px] text-[10px] text-slate-500">{checksum}</p>
                </div>
              </div>
              <div
                className={`rounded-lg border-2 px-4 py-3 text-center text-[10px] font-bold ${
                  finalized
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                    : 'border-amber-500 bg-amber-50 text-amber-900'
                }`}
              >
                OFFICIAL ESCROW SEAL
                <br />
                <span className={finalized ? 'text-emerald-700' : 'text-amber-700'}>
                  {finalized ? 'CERTIFIED · COMPLETED' : 'DEMO · NOT FINAL'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
