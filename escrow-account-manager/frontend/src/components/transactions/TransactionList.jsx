import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';

const TransactionList = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => { fetchTransactions(); }, [user?.role]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const endpoint = user?.role === 'ADMIN' ? '/transactions' : '/transactions/my';
      const res = await axios.get(endpoint);
      setTransactions(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (filter === 'ALL') return transactions;
    return transactions.filter((t) => t.status === filter);
  }, [transactions, filter]);

  if (loading) return <LoadingSpinner text="Loading transactions" />;

  return (
    <div className="page-wrapper space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Transactions</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {user?.role === 'ADMIN' ? 'All platform transactions' : 'Your escrow transactions'}
          </p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input-field sm:w-52">
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="FUNDS_DEPOSITED">Funds Deposited</option>
          <option value="MUTATION_INITIATED">Mutation Initiated</option>
          <option value="MUTATION_IN_PROGRESS">Mutation In Progress</option>
          <option value="MUTATION_COMPLETED">Mutation Completed</option>
          <option value="FUNDS_RELEASED">Funds Released</option>
          <option value="REFUNDED">Refunded</option>
        </select>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {['ALL','PENDING','FUNDS_DEPOSITED','MUTATION_INITIATED','MUTATION_IN_PROGRESS','MUTATION_COMPLETED','FUNDS_RELEASED','REFUNDED'].map((s) => {
          const count = s === 'ALL' ? transactions.length : transactions.filter((t) => t.status === s).length;
          if (s !== 'ALL' && count === 0) return null;
          return (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                filter === s ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'
              }`}>
              {s === 'ALL' ? 'All' : s.replace(/_/g, ' ')} ({count})
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card p-14 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">📋</div>
          <p className="text-slate-600 font-semibold">No transactions found</p>
          <p className="text-slate-400 text-sm mt-1">
            {filter !== 'ALL' ? 'Try changing the filter' : 'Browse properties to start a transaction'}
          </p>
          {filter === 'ALL' && (
            <Link to="/properties" className="btn-primary text-sm mt-4 inline-flex">Browse Properties</Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((txn) => (
            <div key={txn.id} className="card p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 hover:border-primary-200 transition-colors">
              <div className="flex-grow min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-bold text-slate-700">{txn.transactionId}</span>
                  <StatusBadge status={txn.status} />
                </div>
                <p className="text-base font-semibold text-slate-900 truncate">{txn.property?.title || 'Unknown property'}</p>
                <p className="text-sm text-slate-500 mt-0.5">
                  Buyer: <span className="font-medium text-slate-700">{txn.buyer?.name || 'N/A'}</span>
                  {' · '}
                  Seller: <span className="font-medium text-slate-700">{txn.seller?.name || 'N/A'}</span>
                </p>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Amount</p>
                  <p className="text-xl font-extrabold text-slate-900">${Number(txn.amount).toLocaleString()}</p>
                </div>
                <Link to={`/transactions/${txn.id}`} className="btn-primary text-sm whitespace-nowrap">
                  Open Workspace
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransactionList;
