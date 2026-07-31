import React from 'react';

const EscrowLedger = ({ transaction }) => {
  if (!transaction) return null;

  const basePrice = Number(transaction.amount || 0);
  const platformFee = Number(transaction.buyerFee || 0); // Assuming buyer fee is stored here. Let's calculate if needed.
  const totalDeposit = basePrice + platformFee;
  const isFunded = parseFloat(transaction.escrowAccount?.balance || 0) > 0;
  
  return (
    <div className="card bg-white overflow-hidden mt-6">
      <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
        <h3 className="text-white font-bold text-sm tracking-widest uppercase flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Escrow Financial Ledger
        </h3>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
          isFunded 
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
        }`}>
          {isFunded ? 'Vault Funded' : 'Awaiting Deposit'}
        </span>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          
          {/* Buyer Side */}
          <div className="space-y-3 relative z-10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Buyer Obligation</p>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-semibold">Property Price:</span>
              <span className="font-bold text-slate-800">${basePrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-semibold">Platform Fee (1%):</span>
              <span className="font-bold text-slate-800">${platformFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
              <span className="text-slate-600 font-bold uppercase text-[10px] mt-1">Total Required:</span>
              <span className="font-black text-slate-900">${totalDeposit.toLocaleString()}</span>
            </div>
          </div>
          
          {/* Vault Center */}
          <div className="flex flex-col items-center justify-center border-x border-slate-100 px-4 relative z-10">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-4 mb-2 shadow-sm ${
              isFunded ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
            }`}>
              <svg className={`w-8 h-8 ${isFunded ? 'text-emerald-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Custody Balance</p>
            <p className={`text-xl font-black mt-1 ${isFunded ? 'text-emerald-600' : 'text-slate-800'}`}>
              ${Number(transaction.escrowAccount?.balance || 0).toLocaleString()}
            </p>
          </div>
          
          {/* Seller Side */}
          <div className="space-y-3 relative z-10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Seller Payout</p>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-semibold">Gross Proceeds:</span>
              <span className="font-bold text-slate-800">${basePrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-semibold">Platform Fee:</span>
              <span className="font-bold text-slate-800">$0.00</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
              <span className="text-slate-600 font-bold uppercase text-[10px] mt-1">Pending Settlement:</span>
              <span className="font-black text-slate-900">${basePrice.toLocaleString()}</span>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default EscrowLedger;
