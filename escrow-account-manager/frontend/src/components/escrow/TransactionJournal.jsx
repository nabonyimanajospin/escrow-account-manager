import React, { useEffect, useState } from 'react';
import axios from '../../api/axiosConfig';
import toast from 'react-hot-toast';

const TransactionJournal = ({ transactionId }) => {
  const [journalData, setJournalData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJournal();
  }, [transactionId]);

  const fetchJournal = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/escrow/${transactionId}/journal`);
      if (res.data.success) {
        setJournalData(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load accounting journal');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 animate-pulse space-y-4">
        <div className="h-6 w-48 bg-slate-200 rounded"></div>
        <div className="h-20 bg-slate-100 rounded"></div>
        <div className="h-40 bg-slate-100 rounded"></div>
      </div>
    );
  }

  if (!journalData) return null;

  const { summary, entries } = journalData;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden font-sans printable-journal">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/20 text-amber-300 text-xs px-2.5 py-1 rounded-full font-mono uppercase font-semibold tracking-wider">
              Auditable General Journal
            </span>
            <span className="text-xs text-slate-400 font-mono">Tx #{transactionId}</span>
          </div>
          <h2 className="text-2xl font-black mt-2 tracking-tight">Double-Entry Accounting Ledger</h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time debit & credit journal for financial transparency and audit trail compliance.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="no-print bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg border border-slate-700 transition flex items-center gap-2"
        >
          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 000-4h-6a2 2 0 000 4zm8-12V5a2 2 0 00-2-2H7a2 2 0 00-2 2v4h14z" />
          </svg>
          Print Journal Statement
        </button>
      </div>

      {/* Summary Financial Cards */}
      <div className="p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Buyer Debit Total</p>
          <p className="text-lg font-black text-slate-900 mt-1">
            ${Number(summary.totalBuyerPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Price (${summary.price?.toLocaleString()}) + 1.0% Fee</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Escrow Custody Lock</p>
          <p className="text-lg font-black text-amber-600 mt-1">
            ${Number(summary.totalBuyerPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">State: <span className="font-semibold text-slate-800">{summary.escrowStatus}</span></p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Seller Net Payout</p>
          <p className="text-lg font-black text-emerald-600 mt-1">
            ${Number(summary.sellerNetPayout || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Excludes 1.5% seller fee</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Platform Revenue</p>
          <p className="text-lg font-black text-blue-600 mt-1">
            ${Number(summary.platformTotalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Buyer (1.0%) + Seller (1.5%)</p>
        </div>
      </div>

      {/* Journal Table */}
      <div className="p-6">
        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Recorded Ledger Entries ({entries.length})
        </h3>

        {entries.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <p className="text-sm font-semibold text-slate-500">No accounting ledger entries recorded yet.</p>
            <p className="text-xs text-slate-400 mt-1">Ledger entries are created automatically when funds are deposited or moved.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="p-3">ID / Date</th>
                  <th className="p-3">Account Header</th>
                  <th className="p-3 text-center">Type</th>
                  <th className="p-3 text-right">Debit (-)</th>
                  <th className="p-3 text-right">Credit (+)</th>
                  <th className="p-3">Description & Audit Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {entries.map((entry) => {
                  const isDebit = entry.type === 'DEBIT';
                  const amt = Number(entry.amount).toLocaleString(undefined, { minimumFractionDigits: 2 });
                  
                  const accountStyles = {
                    BUYER_CASH: 'bg-slate-100 text-slate-800 border-slate-300',
                    ESCROW_CUSTODY: 'bg-amber-100 text-amber-800 border-amber-300',
                    SELLER_CASH: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                    PLATFORM_REVENUE: 'bg-blue-100 text-blue-800 border-blue-300',
                  };

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono">
                        <div className="font-bold text-slate-900">#{entry.id}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(entry.createdAt).toLocaleString()}
                        </div>
                      </td>

                      <td className="p-3">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${accountStyles[entry.accountType] || 'bg-slate-100'}`}>
                          {entry.accountType}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded ${isDebit ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {entry.type}
                        </span>
                      </td>

                      <td className="p-3 text-right font-mono font-bold text-rose-600">
                        {isDebit ? `$${amt}` : '—'}
                      </td>

                      <td className="p-3 text-right font-mono font-bold text-emerald-600">
                        {!isDebit ? `$${amt}` : '—'}
                      </td>

                      <td className="p-3 text-slate-600 text-xs leading-relaxed max-w-xs">
                        {entry.description || 'System balance shift entry'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Certificate Footer */}
      <div className="p-4 bg-slate-900 text-slate-400 text-[11px] border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-2">
        <span className="font-mono">Verified Double-Entry Ledger System • ISO 20022 Compliant</span>
        <span className="text-[10px]">RWANDA LAND REGISTRY & ESCROW VAULT INTEGRATED</span>
      </div>
    </div>
  );
};

export default TransactionJournal;
