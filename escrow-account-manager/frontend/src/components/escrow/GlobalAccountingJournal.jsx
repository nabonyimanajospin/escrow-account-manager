import React, { useEffect, useState } from 'react';
import axios from '../../api/axiosConfig';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const money = (n) =>
  `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const accountStyles = {
  BUYER_CASH: 'bg-slate-100 text-slate-800 border-slate-300',
  ESCROW_CUSTODY: 'bg-amber-100 text-amber-800 border-amber-300',
  SELLER_CASH: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  PLATFORM_REVENUE: 'bg-blue-100 text-blue-800 border-blue-300',
  EXTERNAL_CLEARING: 'bg-indigo-100 text-indigo-800 border-indigo-300',
};

const EntryRows = ({ entries }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left text-xs border-collapse">
      <thead>
        <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
          <th className="p-3">Date</th>
          <th className="p-3">Account</th>
          <th className="p-3 text-center">Type</th>
          <th className="p-3 text-right">Amount</th>
          <th className="p-3">Description</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200">
        {entries.map((entry) => {
          const isDebit = entry.type === 'DEBIT';
          const amt = Number(entry.amount).toLocaleString(undefined, { minimumFractionDigits: 2 });
          return (
            <tr key={entry.id} className="hover:bg-slate-50">
              <td className="p-3 font-mono text-[10px] text-slate-500">
                {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '—'}
              </td>
              <td className="p-3">
                <span className={`inline-block px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${accountStyles[entry.accountType] || 'bg-slate-100'}`}>
                  {entry.accountType}
                </span>
                {entry.source === 'WALLET' && (
                  <span className="ml-1 inline-block px-1.5 py-0.5 text-[9px] font-bold bg-blue-100 text-blue-700 rounded">WALLET</span>
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
              <td className="p-3 text-slate-600 max-w-md">{entry.description}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const GlobalAccountingJournal = ({ forceAudit = false }) => {
  const { user } = useAuth();
  const [journalData, setJournalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [expandedDeal, setExpandedDeal] = useState(null);

  useEffect(() => {
    fetchGlobalJournal();
  }, []);

  const fetchGlobalJournal = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/escrow/my-global-journal');
      if (res.data.success) {
        setJournalData(res.data.data);
        const firstDeal = res.data.data?.deals?.[0]?.transactionId;
        if (firstDeal) setExpandedDeal(firstDeal);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load accounting journal');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const response = await axios.get('/escrow/my-global-journal/export', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `escrowtrust-journal-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV report downloaded');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200 animate-pulse space-y-4">
        <div className="h-6 w-48 bg-slate-200 rounded" />
        <div className="h-20 bg-slate-100 rounded" />
        <div className="h-40 bg-slate-100 rounded" />
      </div>
    );
  }

  if (!journalData) return null;

  const { summary, entries = [], deals = [], mode } = journalData;
  const isAudit = mode === 'AUDIT' || forceAudit || user?.role === 'ADMIN';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden font-sans">
      <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-1 rounded-full font-mono uppercase font-semibold tracking-wider">
            {isAudit ? 'Platform Audit Journal' : 'My Money Journal'}
          </span>
          <h2 className="text-xl sm:text-2xl font-black mt-2">
            {isAudit ? 'Deal-by-Deal Accounting Audit Book' : 'Your Personal Money Trail'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isAudit
              ? 'Every transaction listed with full buyer/seller journal from start to end — for smooth audits.'
              : 'Only movements related to your wallet and your escrow money — not other parties’ books.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exporting}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-emerald-500 transition"
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 transition"
          >
            Print
          </button>
        </div>
      </div>

      <div className="p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Deals</p>
          <p className="text-lg font-black text-slate-900 mt-1 tabular-nums">{summary.totalDeals}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-bold text-rose-600 uppercase">Total Debits</p>
          <p className="text-lg font-black text-rose-600 mt-1 tabular-nums">{money(summary.totalDebit)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-bold text-emerald-600 uppercase">Total Credits</p>
          <p className="text-lg font-black text-emerald-600 mt-1 tabular-nums">{money(summary.totalCredit)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-bold text-blue-600 uppercase">Net Position</p>
          <p className="text-lg font-black text-blue-600 mt-1 tabular-nums">{money(summary.netPosition)}</p>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {isAudit ? (
          deals.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <p className="text-sm font-semibold text-slate-500">No escrow deals with ledger entries yet.</p>
            </div>
          ) : (
            deals.map((deal, idx) => {
              const open = expandedDeal === deal.transactionId;
              return (
                <div key={deal.transactionId} className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedDeal(open ? null : deal.transactionId)}
                    className="w-full text-left p-4 bg-slate-50 hover:bg-slate-100 transition flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Deal {idx + 1} · TX #{deal.transactionId} · {deal.status}
                      </p>
                      <p className="text-sm font-black text-slate-900 truncate">{deal.propertyTitle}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Buyer: <span className="font-semibold text-slate-700">{deal.buyer?.name}</span>
                        {' · '}
                        Seller: <span className="font-semibold text-slate-700">{deal.seller?.name}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-[11px] font-bold">
                      <span className="px-2 py-1 rounded bg-white border border-slate-200">Paid {money(deal.totalBuyerPaid)}</span>
                      <span className="px-2 py-1 rounded bg-white border border-slate-200 text-emerald-700">Seller {money(deal.sellerNetPayout)}</span>
                      <span className="px-2 py-1 rounded bg-white border border-slate-200 text-blue-700">Platform {money(deal.platformTotalRevenue)}</span>
                      <span className="px-2 py-1 rounded bg-slate-900 text-white">{open ? 'Hide journal' : 'Show full journal'}</span>
                    </div>
                  </button>
                  {open && (
                    <div className="p-4 border-t border-slate-200 bg-white">
                      {(deal.entries || []).length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-4">No ledger lines for this deal yet.</p>
                      ) : (
                        <EntryRows entries={deal.entries} />
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : entries.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <p className="text-sm font-semibold text-slate-500">No personal money movements recorded yet.</p>
          </div>
        ) : (
          <>
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Your entries ({entries.length})
            </h3>
            <EntryRows entries={entries} />
          </>
        )}
      </div>
    </div>
  );
};

export default GlobalAccountingJournal;
