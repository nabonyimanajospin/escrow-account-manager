import React from 'react';

const EscrowTimeline = ({ status }) => {
  const states = ['PENDING', 'FUNDED', 'MUTATION_STARTED', 'UNDER_REVIEW', 'AWAITING_RECEIPT', 'COMPLETED'];
  let currentStep = states.indexOf(status);
  
  if (status === 'REFUNDED') currentStep = -1; // special cancel case
  if (status === 'DISPUTED') currentStep = -2; // special dispute case

  if (status === 'REFUNDED') {
    return (
      <div className="card p-6 bg-white border border-slate-200">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Escrow Transaction Progress</h2>
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
          <p className="text-sm font-bold text-red-800">Transaction Voided</p>
          <p className="text-xs text-red-600 mt-1">This transaction agreement has been cancelled, and any deposited capital has been refunded.</p>
        </div>
      </div>
    );
  }

  if (status === 'DISPUTED') {
    return (
      <div className="card p-6 bg-white border border-slate-200">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Escrow Transaction Progress</h2>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
          <p className="text-sm font-bold text-amber-800">⚠️ Active Dispute Filed</p>
          <p className="text-xs text-amber-600 mt-1">This transaction is currently frozen under active dispute mediation. No funds will be released until the arbitrator resolves this case.</p>
        </div>
      </div>
    );
  }

  const steps = [
    { label: 'Agreement Pending', key: 'PENDING', desc: 'Sign online contract' },
    { label: 'Escrow Funded', key: 'FUNDED', desc: 'Buyer deposits capital' },
    { label: 'Mutation Initiated', key: 'MUTATION_STARTED', desc: 'Seller starts ownership transfer' },
    { label: 'Under Review', key: 'UNDER_REVIEW', desc: 'Admin audits documents' },
    { label: 'Awaiting Receipt', key: 'AWAITING_RECEIPT', desc: 'Seller confirms payout' },
    { label: 'Settled / Sold', key: 'COMPLETED', desc: 'Transaction finalized' },
  ];

  return (
    <div className="card p-6 bg-white border border-slate-200">
      <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Escrow Transaction Progress</h2>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
        <div className="hidden md:block absolute left-4 right-4 top-1/2 -translate-y-1/2 h-[3px] bg-slate-100 -z-10" />
        
        {steps.map((step, idx) => {
          const isPast = currentStep > idx;
          const isCurrent = currentStep === idx;
          return (
            <div key={step.key} className="flex-1 flex md:flex-col items-center gap-4 md:gap-3 text-left md:text-center">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                isPast
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : isCurrent
                  ? 'border-primary-600 bg-primary-600 text-white shadow'
                  : 'border-slate-200 bg-white text-slate-400'
              }`}>
                {idx + 1}
              </div>
              <div className="leading-tight">
                <p className={`text-sm font-bold ${isCurrent ? 'text-primary-700' : 'text-slate-800'}`}>{step.label}</p>
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
