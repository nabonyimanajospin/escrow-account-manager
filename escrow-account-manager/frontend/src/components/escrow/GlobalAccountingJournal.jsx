import React, { useEffect, useState } from 'react';
import axios from '../../api/axiosConfig';
import toast from 'react-hot-toast';

const GlobalAccountingJournal = () => {
  const [journalData, setJournalData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGlobalJournal();
  }, []);

  const fetchGlobalJournal = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/escrow/my-global-journal');
      if (res.data.success) {
        setJournalData(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load global accounting journal');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200 animate-pulse space-y-4">
        <div className="h-6 w-48 bg-slate-200 rounded"></div>
        <div className="h-20 bg-slate-100 rounded"></div>
        <div className="h-40 bg-slate-100 rounded"></div>
      </div>
    );
  }

  if (!journalData) return null;

  const { summary, entries } = journalData;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-1 rounded-full font-mono uppercase font-semibold tracking-wider">
            Platform Accounting Audit
          </span>
          <h2 className="text-xl sm:text-2xl font-black mt-2">Platform-Wide General Accounting Journal</h2>
          <p className="text-xs text-slate-400 mt-1">
            Escrow deal entries plus wallet funding / payout movements (double-entry view).
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 transition"
        >
          Print Global Ledger
        </button>
      </div>

      {/* Summary Stats */}
      <div className="p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 min-w-0 overflow-hidden">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Total Active Deals</p>
          <p className="text-lg xl:text-xl font-black text-slate-900 mt-1 tabular-nums leading-tight">
            {summary.totalDeals}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 min-w-0 overflow-hidden">
          <p className="text-[11px] font-bold text-rose-600 uppercase">Total Debits (-)</p>
          <p className="text-lg xl:text-xl font-black text-rose-600 mt-1 tabular-nums leading-tight break-words">
            ${Number(summary.totalDebit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 min-w-0 overflow-hidden">
          <p className="text-[11px] font-bold text-emerald-600 uppercase">Total Credits (+)</p>
          <p className="text-lg xl:text-xl font-black text-emerald-600 mt-1 tabular-nums leading-tight break-words">
            ${Number(summary.totalCredit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 min-w-0 overflow-hidden">
          <p className="text-[11px] font-bold text-blue-600 uppercase">Net Accounting Position</p>
          <p className="text-lg xl:text-xl font-black text-blue-600 mt-1 tabular-nums leading-tight break-words">
            ${Number(summary.netPosition || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="p-6">
        <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-4">
          All Recorded Ledger Entries ({entries.length})
        </h3>

        {entries.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <p className="text-sm font-semibold text-slate-500">No global accounting entries recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="p-3">ID / Date</th>
                  <th className="p-3">Deal Reference</th>
                  <th className="p-3">Account Header</th>
                  <th className="p-3 text-center">Type</th>
                  <th className="p-3 text-right">Amount ($)</th>
                  <th className="p-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {entries.map((entry) => {
                  const isDebit = entry.type === 'DEBIT';
                  const amt = Number(entry.amount).toLocaleString(undefined, { minimumFractionDigits: 2 });

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono">
                        <div className="font-bold text-slate-900">#{entry.id}</div>
                        <div className="text-[10px] text-slate-400">{new Date(entry.createdAt).toLocaleDateString()}</div>
                      </td>

                      <td className="p-3 font-bold text-slate-800">
                        {entry.source === 'WALLET'
                          ? 'Wallet funding / payout'
                          : (entry.transaction?.property?.title || `Tx #${entry.transactionId}`)}
                      </td>

                      <td className="p-3">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 rounded border border-slate-300">
                          {entry.accountType}
                        </span>
                        {entry.source === 'WALLET' && (
                          <span className="ml-1 inline-block px-1.5 py-0.5 text-[9px] font-bold bg-blue-100 text-blue-700 rounded">
                            WALLET
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded ${isDebit ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {entry.type}
                        </span>
                      </td>

                      <td className={`p-3 text-right font-mono font-bold ${isDebit ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {isDebit ? `-${amt}` : `+${amt}`}
                      </td>

                      <td className="p-3 text-slate-600 max-w-xs truncate">{entry.description}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalAccountingJournal;
