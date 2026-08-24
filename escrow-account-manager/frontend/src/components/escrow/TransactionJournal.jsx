import React, { useEffect, useState } from 'react';
import axios from '../../api/axiosConfig';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const accountStyles = {
  BUYER_CASH: 'bg-slate-100 text-slate-800 border-slate-300',
  ESCROW_CUSTODY: 'bg-amber-100 text-amber-800 border-amber-300',
  SELLER_CASH: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  PLATFORM_REVENUE: 'bg-blue-100 text-blue-800 border-blue-300',
};

const money = (n) =>
  `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const TransactionJournal = ({ transactionId }) => {
  const { user } = useAuth();
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

  const handlePrint = () => window.print();

  const handleExportCsv = async () => {
    try {
      const response = await axios.get(`/escrow/${transactionId}/journal/export`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `EscrowTrust_Journal_TX_${transactionId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV ledger statement downloaded');
    } catch (err) {
      console.error(err);
      toast.error('Failed to download CSV statement');
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 animate-pulse space-y-4">
        <div className="h-6 w-48 bg-slate-200 rounded" />
        <div className="h-20 bg-slate-100 rounded" />
        <div className="h-40 bg-slate-100 rounded" />
      </div>
    );
  }

  if (!journalData) return null;

  const { summary, entries, viewScope } = journalData;
  const isAdmin = user?.role === 'ADMIN' || viewScope === 'FULL_AUDIT';
  const isBuyerView = viewScope === 'BUYER_MONEY_TRAIL' || (!isAdmin && user?.role === 'BUYER');
  const isSellerView = viewScope === 'SELLER_MONEY_TRAIL' || (!isAdmin && user?.role === 'SELLER');

  const title = isAdmin
    ? 'Full Deal Accounting Ledger'
    : isBuyerView
      ? 'Your Money Trail'
      : 'Your Payout Trail';

  const subtitle = isAdmin
    ? 'Complete double-entry journal for this escrow deal (buyer, seller, custody, platform).'
    : isBuyerView
      ? 'Only entries related to your payment into escrow — follow how your money moved.'
      : 'Only entries related to escrow custody and your seller payout.';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden font-sans printable-journal">
      <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-amber-500/20 text-amber-300 text-xs px-2.5 py-1 rounded-full font-mono uppercase font-semibold tracking-wider">
              {isAdmin ? 'Full Audit Journal' : 'Personal Money Journal'}
            </span>
            <span className="text-xs text-slate-400 font-mono">Tx #{transactionId}</span>
          </div>
          <h2 className="text-2xl font-black mt-2 tracking-tight">{title}</h2>
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        </div>

        <div className="no-print flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-lg border border-emerald-500 transition cursor-pointer shadow-sm"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-lg border border-slate-700 transition cursor-pointer"
          >
            Print
          </button>
        </div>
      </div>

      <div className={`p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
        {(isAdmin || isBuyerView) && (
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isBuyerView ? 'You Paid Into Escrow' : 'Buyer Debit Total'}
            </p>
            <p className="text-lg font-black text-slate-900 mt-1">{money(summary.totalBuyerPaid)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Price ({money(summary.price)}) + 1.0% fee
            </p>
          </div>
        )}

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Escrow Custody</p>
          <p className="text-lg font-black text-amber-600 mt-1">{money(summary.totalBuyerPaid)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Status: <span className="font-semibold text-slate-800">{summary.escrowStatus}</span>
          </p>
        </div>

        {(isAdmin || isSellerView) && (
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
              {isSellerView ? 'You Receive (Net)' : 'Seller Net Payout'}
            </p>
            <p className="text-lg font-black text-emerald-600 mt-1">{money(summary.sellerNetPayout)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">After 1.5% seller fee</p>
          </div>
        )}

        {isAdmin && (
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Platform Revenue</p>
            <p className="text-lg font-black text-blue-600 mt-1">{money(summary.platformTotalRevenue)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Buyer 1.0% + Seller 1.5%</p>
          </div>
        )}
      </div>

      <div className="p-6">
        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4">
          Recorded Entries ({entries.length})
        </h3>

        {entries.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <p className="text-sm font-semibold text-slate-500">No ledger entries recorded yet for your view.</p>
            <p className="text-xs text-slate-400 mt-1">Entries appear when funds are deposited or released.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="p-3">ID / Date</th>
                  <th className="p-3">Account</th>
                  <th className="p-3 text-center">Type</th>
                  <th className="p-3 text-right">Debit (-)</th>
                  <th className="p-3 text-right">Credit (+)</th>
                  <th className="p-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {entries.map((entry) => {
                  const isDebit = entry.type === 'DEBIT';
                  const amt = Number(entry.amount).toLocaleString(undefined, { minimumFractionDigits: 2 });
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono">
                        <div className="font-bold text-slate-900">#{entry.id}</div>
                        <div className="text-[10px] text-slate-400">{new Date(entry.createdAt).toLocaleString()}</div>
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
                      <td className="p-3 text-right font-mono font-bold text-rose-600">{isDebit ? `$${amt}` : '—'}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600">{!isDebit ? `$${amt}` : '—'}</td>
                      <td className="p-3 text-slate-600 text-xs leading-relaxed max-w-xs">{entry.description || 'System entry'}</td>
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

export default TransactionJournal;
