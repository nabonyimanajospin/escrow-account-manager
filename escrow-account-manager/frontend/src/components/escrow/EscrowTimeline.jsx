import React from 'react';

const EscrowTimeline = ({ status }) => {
  const states = ['PENDING', 'FUNDED', 'MUTATION_STARTED', 'UNDER_REVIEW', 'AWAITING_RECEIPT', 'COMPLETED'];
  let currentStep = states.indexOf(status);
  
  if (status === 'REFUNDED') currentStep = -1; // special cancel case
  if (status === 'DISPUTED') currentStep = -2; // special dispute case

  if (status === 'REFUNDED') {
    return (
      <div className="card p-6 bg-white border border-slate-200 shadow-sm">
        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Escrow Transaction Progress</h2>
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
          <p className="text-sm font-black text-red-800">✕ Transaction Voided & Refunded</p>
          <p className="text-xs text-red-600 mt-1">This transaction agreement was cancelled or rejected by admin. Capital has been fully refunded to the buyer.</p>
        </div>
      </div>
    );
  }

  if (status === 'DISPUTED') {
    return (
      <div className="card p-6 bg-white border border-slate-200 shadow-sm">
        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Escrow Transaction Progress</h2>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
          <p className="text-sm font-black text-amber-900">⚠️ Active Dispute Mediation</p>
          <p className="text-xs text-amber-700 mt-1">This transaction is frozen under active dispute mediation. No funds will be released until arbitrator reaches a settlement decision.</p>
        </div>
      </div>
    );
  }

  const steps = [
    { label: 'Agreement Pending', key: 'PENDING', desc: 'Sign online contract' },
    { label: 'Escrow Funded', key: 'FUNDED', desc: 'Buyer deposits capital' },
    { label: 'Mutation Initiated', key: 'MUTATION_STARTED', desc: 'Irembo title transfer initiated' },
    { label: 'Under Review', key: 'UNDER_REVIEW', desc: 'Irembo registry & deed verification' },
    { label: 'Awaiting Receipt', key: 'AWAITING_RECEIPT', desc: 'Seller confirms payout' },
    { label: 'Settled / Sold', key: 'COMPLETED', desc: 'Transaction finalized' },
  ];

  return (
    <div className="card p-6 bg-white border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Escrow Transaction Progress Stepper</h2>
        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          ✓ Ticked Step Protocol
        </span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative pt-2">
        <div className="hidden md:block absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-100 -z-10" />
        
        {steps.map((step, idx) => {
          const isPast = currentStep > idx;
          const isCurrent = currentStep === idx;
          return (
            <div key={step.key} className="flex-1 flex md:flex-col items-center gap-3 text-left md:text-center">
              {/* Step Circle with Checkmark Ticks (✓) for completed stages */}
              <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-black transition-all ${
                isPast
                  ? 'border-emerald-600 bg-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-105'
                  : isCurrent
                  ? 'border-emerald-600 bg-slate-900 text-emerald-400 ring-4 ring-emerald-500/20 animate-pulse'
                  : 'border-slate-200 bg-white text-slate-400'
              }`}>
                {isPast ? (
                  <span className="text-sm font-black">✓</span>
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <div className="leading-tight">
                <p className={`text-xs font-black ${isCurrent ? 'text-emerald-700 font-sans' : isPast ? 'text-slate-900' : 'text-slate-500'}`}>
                  {step.label} {isPast && <span className="text-emerald-600 font-extrabold ml-0.5">✓</span>}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed font-semibold">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EscrowTimeline;
