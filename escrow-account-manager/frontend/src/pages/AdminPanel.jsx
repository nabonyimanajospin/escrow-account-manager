import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axiosConfig';
import StatusBadge from '../components/StatusBadge';
import AuditLog from '../components/AuditLog';
import toast from 'react-hot-toast';

const AdminPanel = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('properties');
  const [propsList, setPropsList] = useState([]);
  const [txnsList, setTxnsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [ledgerLogs, setLedgerLogs] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  // Modal state for release/refund audit notes
  const [modal, setModal] = useState(null); // { type: 'release'|'refund', txId, txCode }
  const [modalNotes, setModalNotes] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [propRes, txnRes, userRes, logRes] = await Promise.all([
        axios.get('/properties'),
        axios.get('/admin/transactions'),
        axios.get('/auth/users'),
        axios.get('/admin/audit-logs'),
      ]);

      setPropsList(propRes.data.data || []);
      setTxnsList(txnRes.data.data || []);
      setUsersList(userRes.data.data || []);
      setLedgerLogs(logRes.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load administrative console data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteProperty = async (propId, title) => {
    if (!window.confirm(`Are you sure you want to delete property "${title}"? This will delete any associated active transactions. This cannot be undone.`)) return;
    try {
      setActionLoading(true);
      await axios.delete(`/properties/${propId}`);
      toast.success('Property listing deleted successfully');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete property');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTransaction = async (txnId, code) => {
    if (!window.confirm(`Are you sure you want to delete transaction "${code}" permanently from the database?`)) return;
    try {
      setActionLoading(true);
      await axios.delete(`/admin/transactions/${txnId}`);
      toast.success('Transaction record purged successfully');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to purge transaction');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRelease = (id, code) => {
    setModalNotes('');
    setModal({ type: 'release', txId: id, txCode: code });
  };

  const handleRefund = (id, code) => {
    setModalNotes('');
    setModal({ type: 'refund', txId: id, txCode: code });
  };

  const handleModalConfirm = async () => {
    if (!modalNotes.trim()) {
      toast.error('Audit notes are required.');
      return;
    }
    const { type, txId, txCode } = modal;
    setModal(null);
    try {
      setActionLoading(true);
      if (type === 'release') {
        await axios.post(`/admin/transactions/${txId}/release`, { adminNotes: modalNotes });
        toast.success('Escrow funds successfully released to seller');
      } else {
        await axios.post(`/admin/transactions/${txId}/refund`, { adminNotes: modalNotes });
        toast.success('Escrow funds successfully refunded to buyer');
      }
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || `${type === 'release' ? 'Release' : 'Refund'} failed`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-10 w-10 text-primary-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-semibold text-slate-500">Decrypting ledger and transactions...</span>
        </div>
      </div>
    );
  }

  // Filter deals requiring attention
  const pendingReviewsCount = txnsList.filter(t => t.status === 'UNDER_REVIEW').length;
  
  const totalLockedValue = txnsList
    .filter(t => ['PENDING', 'FUNDED', 'MUTATION_STARTED', 'UNDER_REVIEW', 'DISPUTED'].includes(t.status))
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const activeDisputes = txnsList.filter(t => t.status === 'DISPUTED').length;
  
  const platformRevenue = txnsList
    .filter(t => ['AWAITING_RECEIPT', 'COMPLETED'].includes(t.status))
    .reduce((sum, t) => sum + Number(t.buyerFee || 0) + Number(t.sellerFee || 0), 0);

  return (
    <div className="page-wrapper dashboard-wrapper space-y-7 animate-fade-in">
      
      {/* Welcome banner */}
      <div className="card-tinted p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-sans">Platform Administration Console</h1>
          <p className="text-slate-500 mt-1 text-sm font-semibold">
            Oversee listings, settle active escrows, and inspect the immutable audit ledger.
          </p>
        </div>
        {pendingReviewsCount > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-2 text-xs font-bold text-amber-800 leading-tight">
            Attention Required: {pendingReviewsCount} deal{pendingReviewsCount > 1 ? 's' : ''} awaiting review.
          </div>
        )}
      </div>

      {/* Operational Analytics Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 bg-white border border-slate-200 flex flex-col gap-1 text-left">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Escrow Value Locked</span>
          <span className="text-xl font-extrabold text-slate-900">${totalLockedValue.toLocaleString()} USD</span>
          <span className="text-[9px] text-slate-400 font-semibold mt-1">Sum of active escrow holdings</span>
        </div>

        <div className="card p-5 bg-white border border-slate-200 flex flex-col gap-1 text-left">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Awaiting Review</span>
          <span className="text-xl font-extrabold text-amber-600">{pendingReviewsCount} Deals</span>
          <span className="text-[9px] text-slate-400 font-semibold mt-1">Pending admin release checklist</span>
        </div>

        <div className="card p-5 bg-white border border-slate-200 flex flex-col gap-1 text-left">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Disputes</span>
          <span className={`text-xl font-extrabold ${activeDisputes > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{activeDisputes} Cases</span>
          <span className="text-[9px] text-slate-400 font-semibold mt-1">Requiring active arbitration rulings</span>
        </div>

        <div className="card p-5 bg-white border border-slate-200 flex flex-col gap-1 text-left">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Platform Revenue</span>
          <span className="text-xl font-extrabold text-emerald-600">${platformRevenue.toLocaleString()} USD</span>
          <span className="text-[9px] text-slate-400 font-semibold mt-1">Accrued service split charges</span>
        </div>
      </div>

      {/* Main Console Area */}
      <div className="card p-6 space-y-6 bg-white border border-slate-200">
        
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-sans">Control Center</h2>
            <p className="text-xs text-slate-400 mt-0.5 font-bold">Select tab categories to manage properties, deals, users or ledger entries.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['properties', 'transactions', 'users', 'ledger'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-primary-600 text-white shadow-sm font-extrabold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content Components */}
        {activeTab === 'properties' && (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="pb-3 pr-4">Property</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Price</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Seller Account</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {propsList.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pr-4">
                      <Link to={`/properties/${p.id}`} className="text-sm font-bold text-slate-900 hover:text-primary-600 truncate block max-w-[220px]">
                        {p.title}
                      </Link>
                      <span className="text-[10px] text-slate-400 font-semibold block">{p.location}</span>
                    </td>
                    <td className="py-4 pr-4 text-xs font-bold text-slate-500">{p.propertyType}</td>
                    <td className="py-4 pr-4 text-sm font-extrabold text-slate-900">${Number(p.price).toLocaleString()}</td>
                    <td className="py-4 pr-4"><StatusBadge status={p.status} /></td>
                    <td className="py-4 pr-4 text-xs text-slate-500">
                      <span className="font-bold block text-slate-700 leading-tight mb-0.5">{p.seller?.name || 'N/A'}</span>
                      {p.seller?.email || 'N/A'}
                    </td>
                    <td className="py-4">
                      {p.status !== 'PENDING' ? (
                        <button
                          onClick={() => handleDeleteProperty(p.id, p.title)}
                          disabled={actionLoading}
                          className="btn-secondary !px-2.5 !py-1 text-xs hover:!border-red-200 hover:!text-red-600 hover:bg-red-50/50 cursor-pointer"
                        >
                          Delete
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold px-2 py-1 rounded bg-slate-50 border border-slate-200">Locked in deal</span>
                      )}
                    </td>
                  </tr>
                ))}
                {propsList.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-slate-400 text-sm font-semibold">No property listings found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="pb-3 pr-4">Deal ID</th>
                  <th className="pb-3 pr-4">Property</th>
                  <th className="pb-3 pr-4">Escrow Balance</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Participants</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {txnsList.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pr-4 font-mono text-xs font-bold text-slate-500">
                      <Link to={`/escrow/${t.id}`} className="hover:underline hover:text-primary-600">
                        {t.transactionId}
                      </Link>
                    </td>
                    <td className="py-4 pr-4 text-sm font-bold text-slate-900 truncate max-w-[150px]">{t.property?.title || 'Unknown Listing'}</td>
                    <td className="py-4 pr-4 text-sm font-extrabold text-slate-900">${Number(t.escrowAccount?.balance || 0).toLocaleString()}</td>
                    <td className="py-4 pr-4">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="py-4 pr-4 text-[11px] text-slate-500 leading-tight">
                      <span className="block mb-0.5"><strong className="text-slate-700">Buyer:</strong> {t.buyer?.name || 'N/A'}</span>
                      <span className="block"><strong className="text-slate-700">Seller:</strong> {t.seller?.name || 'N/A'}</span>
                    </td>
                    <td className="py-4">
                      {t.status === 'UNDER_REVIEW' || t.status === 'DISPUTED' ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleRelease(t.id, t.transactionId)}
                            disabled={actionLoading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2.5 py-1 rounded transition-colors cursor-pointer"
                          >
                            Release
                          </button>
                          <button
                            onClick={() => handleRefund(t.id, t.transactionId)}
                            disabled={actionLoading}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] px-2.5 py-1 rounded transition-colors cursor-pointer"
                          >
                            Refund
                          </button>
                        </div>
                      ) : ['PENDING', 'COMPLETED', 'REFUNDED'].includes(t.status) ? (
                        <button
                          onClick={() => handleDeleteTransaction(t.id, t.transactionId)}
                          disabled={actionLoading}
                          className="btn-secondary !px-2.5 !py-1 text-xs hover:!border-red-200 hover:!text-red-600 hover:bg-red-50/50 cursor-pointer"
                        >
                          Delete
                        </button>
                      ) : (
                        <Link to={`/escrow/${t.id}`} className="text-xs font-bold text-primary-600 hover:underline">
                          View Workspace
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
                {txnsList.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-slate-400 text-sm font-semibold">No transactions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3 pr-4">Phone</th>
                  <th className="pb-3 pr-4">Physical Address</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pr-4">
                      <span className="text-sm font-bold text-slate-900 block leading-tight">{u.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">ID: {u.id}</span>
                    </td>
                    <td className="py-4 pr-4 text-sm text-slate-600">{u.email}</td>
                    <td className="py-4 pr-4">
                      <span className={`badge text-[10px] ${
                        u.role === 'ADMIN' ? 'badge-role-admin' :
                        u.role === 'SELLER' ? 'badge-role-seller' :
                        'badge-role-buyer'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-sm text-slate-600 font-mono">{u.phone || 'N/A'}</td>
                    <td className="py-4 pr-4 text-xs text-slate-500 truncate max-w-[150px]">{u.address || 'N/A'}</td>
                    <td className="py-4">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-0.5">
                        Active Profile
                      </span>
                    </td>
                  </tr>
                ))}
                {usersList.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-slate-400 text-sm font-semibold">No registered users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'ledger' && (
          <AuditLog logs={ledgerLogs} />
        )}

      </div>

      {/* ── Release / Refund Confirmation Modal ── */}
      {modal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                modal.type === 'release' ? 'bg-emerald-600' : 'bg-red-600'
              }`}>
                {modal.type === 'release' ? '\u2713' : '\u21a9'}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {modal.type === 'release' ? 'Approve & Release Escrow Funds' : 'Reject & Refund Buyer'}
                </h3>
                <p className="text-xs text-slate-400 font-semibold">Deal: {modal.txCode}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              {modal.type === 'release'
                ? 'You are about to release the locked escrow funds to the seller. This action is irreversible. Please provide your audit review notes below.'
                : 'You are about to refund the full escrow balance to the buyer and reset the property to AVAILABLE. Please provide your audit review notes below.'}
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Audit Review Notes (Required)</label>
              <textarea
                className="w-full border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="Describe your review findings, document verification outcome, and reason for this decision..."
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setModal(null)} className="flex-1 btn-secondary text-xs !py-2">Cancel</button>
              <button
                onClick={handleModalConfirm}
                disabled={!modalNotes.trim() || actionLoading}
                className={`flex-1 text-xs py-2 font-bold rounded-xl border transition-all cursor-pointer disabled:opacity-40 ${
                  modal.type === 'release'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                    : 'bg-red-600 hover:bg-red-700 text-white border-red-600'
                }`}
              >
                {modal.type === 'release' ? 'Confirm Release' : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;