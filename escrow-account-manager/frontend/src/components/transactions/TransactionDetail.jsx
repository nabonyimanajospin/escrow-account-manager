import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from '../../api/axiosConfig';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';
import ConfirmModal from '../common/ConfirmModal';

const ORDERED_STATUSES = [
  { key: 'PENDING',              label: 'Pending',              desc: 'Transaction created, escrow account ready' },
  { key: 'FUNDS_DEPOSITED',      label: 'Funds Deposited',      desc: 'Buyer deposited the full property price' },
  { key: 'MUTATION_INITIATED',   label: 'Mutation Initiated',   desc: 'Seller started the ownership transfer process' },
  { key: 'MUTATION_IN_PROGRESS', label: 'Mutation In Progress', desc: 'Seller uploaded proof documents' },
  { key: 'MUTATION_COMPLETED',   label: 'Mutation Completed',   desc: 'Ownership transfer legally confirmed' },
];
const FINAL_STATUSES = ['FUNDS_RELEASED', 'REFUNDED'];

const TransactionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Deposit form
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositData, setDepositData] = useState({ amount: '', reference: '' });

  // Document upload form
  const [showUpload, setShowUpload] = useState(false);
  const [uploadData, setUploadData] = useState({ documentUrl: '', description: '' });
  const [uploadFile, setUploadFile] = useState(null);

  useEffect(() => { fetchTransaction(); }, [id]);

  const fetchTransaction = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/transactions/${id}`);
      setTransaction(res.data.data);
    } catch {
      toast.error('Unable to load transaction');
      navigate('/transactions');
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    const res = await axios.get(`/transactions/${id}`);
    setTransaction(res.data.data);
  };

  const handleAction = async (route, payload = {}) => {
    try {
      setActionLoading(true);
      await axios.post(route, payload);
      toast.success('Action completed successfully');
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
      setConfirmOpen(false);
      setShowDeposit(false);
      setShowUpload(false);
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    await handleAction(`/transactions/${id}/deposit`, {
      amount: depositData.amount,
      reference: depositData.reference,
    });
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    let docUrl = uploadData.documentUrl;
    if (uploadFile) {
      // Store filename as reference — no base64 encoding (avoids payload size limits)
      docUrl = `file://${uploadFile.name}`;
    }
    if (!docUrl) { toast.error('Please provide a document URL or upload a file'); return; }
    await handleAction(`/transactions/${id}/upload-document`, {
      documentUrl: docUrl,
      description: uploadData.description || uploadFile?.name || 'Mutation document',
    });
    setUploadFile(null);
  };

  const currentIndex = useMemo(() => ORDERED_STATUSES.findIndex((s) => s.key === transaction?.status), [transaction]);
  const isFinal = FINAL_STATUSES.includes(transaction?.status);
  const isRefundable = ['FUNDS_DEPOSITED','MUTATION_INITIATED','MUTATION_IN_PROGRESS','MUTATION_COMPLETED'].includes(transaction?.status);

  if (loading) return <LoadingSpinner text="Loading escrow workspace" />;
  if (!transaction) return null;

  return (
    <div className="page-wrapper space-y-6 animate-fade-in">

      {/* Breadcrumb + title */}
      <div>
        <Link to="/transactions" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Transactions
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-mono">{transaction.transactionId}</h1>
            <p className="text-slate-500 mt-1">{transaction.property?.title || 'Property transaction'}</p>
          </div>
          <StatusBadge status={transaction.status} />
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-6">

        {/* LEFT COLUMN */}
        <div className="space-y-5">

          {/* Progress timeline */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Escrow Progress</h2>
            <div className="relative pl-8">
              {/* Vertical line */}
              <div className="timeline-line" />

              {ORDERED_STATUSES.map((s, i) => {
                const isActive    = transaction.status === s.key;
                const isCompleted = currentIndex > i || isFinal;
                const isPast      = i < currentIndex;
                return (
                  <div key={s.key} className="relative flex items-start gap-4 pb-6 last:pb-0">
                    <div className={`timeline-dot ${isActive ? 'active' : (isPast || (isFinal && !isActive)) ? 'completed' : ''}`}>
                      {(isPast || (isFinal)) && (
                        <svg className="w-3 h-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="pt-0.5">
                      <p className={`text-sm font-semibold ${isActive ? 'text-primary-700' : isPast || isFinal ? 'text-slate-700' : 'text-slate-400'}`}>
                        {s.label}
                      </p>
                      <p className={`text-xs mt-0.5 ${isActive ? 'text-primary-500' : 'text-slate-400'}`}>{s.desc}</p>
                    </div>
                    {isActive && (
                      <span className="ml-auto flex-shrink-0 badge badge-available text-[10px]">Current</span>
                    )}
                  </div>
                );
              })}

              {/* Final states */}
              {isFinal && (
                <div className="relative flex items-start gap-4 pt-2">
                  <div className={`timeline-dot ${transaction.status === 'FUNDS_RELEASED' ? 'active' : 'completed'}`} />
                  <div className="pt-0.5">
                    <p className={`text-sm font-semibold ${transaction.status === 'FUNDS_RELEASED' ? 'text-primary-700' : 'text-red-600'}`}>
                      {transaction.status === 'FUNDS_RELEASED' ? 'Funds Released' : 'Refunded'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {transaction.status === 'FUNDS_RELEASED' ? 'Seller received payment. Deal complete.' : 'Buyer refunded. Property available again.'}
                    </p>
                  </div>
                  <span className="ml-auto flex-shrink-0 badge badge-completed text-[10px]">Final</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions panel */}
          {!isFinal && (
            <div className="card p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Available Actions</h2>
              <div className="space-y-3">

                {/* BUYER: Deposit */}
                {user?.role === 'BUYER' && transaction.status === 'PENDING' && (
                  <div>
                    <button onClick={() => setShowDeposit(!showDeposit)} className="btn-primary w-full !py-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Deposit Funds to Escrow
                    </button>
                    {showDeposit && (
                      <form onSubmit={handleDeposit} className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                        <div>
                          <label className="input-label">Amount (USD) *</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">$</span>
                            <input
                              className="input-field pl-7"
                              placeholder={`${Number(transaction.amount).toLocaleString()} (exact amount)`}
                              value={depositData.amount}
                              onChange={(e) => setDepositData({ ...depositData, amount: e.target.value })}
                              required
                            />
                          </div>
                          <p className="text-xs text-slate-500 mt-1">Must match exact property price: <strong>${Number(transaction.amount).toLocaleString()}</strong></p>
                        </div>
                        <div>
                          <label className="input-label">Payment Reference</label>
                          <input className="input-field" placeholder="e.g. Bank transfer ref #12345" value={depositData.reference} onChange={(e) => setDepositData({ ...depositData, reference: e.target.value })} />
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setShowDeposit(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
                          <button type="submit" disabled={actionLoading} className="btn-primary flex-1 text-sm">
                            {actionLoading ? 'Processing...' : 'Confirm Deposit'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* SELLER: Initiate mutation */}
                {user?.role === 'SELLER' && transaction.status === 'FUNDS_DEPOSITED' && (
                  <button onClick={() => handleAction(`/transactions/${id}/initiate-mutation`)} disabled={actionLoading} className="btn-primary w-full !py-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {actionLoading ? 'Processing...' : 'Initiate Mutation Process'}
                  </button>
                )}

                {/* SELLER: Upload document */}
                {user?.role === 'SELLER' && ['MUTATION_INITIATED','MUTATION_IN_PROGRESS'].includes(transaction.status) && (
                  <div>
                    <button onClick={() => setShowUpload(!showUpload)} className="btn-secondary w-full !py-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Upload Mutation Document
                    </button>
                    {showUpload && (
                      <form onSubmit={handleUpload} className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                        <div>
                          <label className="input-label">Upload Document File</label>
                          <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-all">
                            <svg className="w-6 h-6 text-slate-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <p className="text-xs text-slate-500">{uploadFile ? uploadFile.name : 'Click to upload PDF or image'}</p>
                            <input type="file" accept=".pdf,image/*" onChange={(e) => setUploadFile(e.target.files[0])} className="hidden" />
                          </label>
                        </div>
                        <div>
                          <label className="input-label">Or paste document URL</label>
                          <input className="input-field" placeholder="https://example.com/mutation-certificate.pdf" value={uploadData.documentUrl} onChange={(e) => setUploadData({ ...uploadData, documentUrl: e.target.value })} />
                        </div>
                        <div>
                          <label className="input-label">Description</label>
                          <input className="input-field" placeholder="e.g. Official mutation certificate from land registry" value={uploadData.description} onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })} />
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setShowUpload(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
                          <button type="submit" disabled={actionLoading} className="btn-primary flex-1 text-sm">
                            {actionLoading ? 'Uploading...' : 'Submit Document'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* SELLER or ADMIN: Complete mutation */}
                {(user?.role === 'SELLER' || user?.role === 'ADMIN') && ['MUTATION_INITIATED', 'MUTATION_IN_PROGRESS'].includes(transaction.status) && (
                  <button onClick={() => handleAction(`/transactions/${id}/complete-mutation`)} disabled={actionLoading} className="btn-primary w-full !py-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {actionLoading ? 'Processing...' : 'Confirm Mutation Complete'}
                  </button>
                )}

                {/* ADMIN: Release funds */}
                {user?.role === 'ADMIN' && transaction.status === 'MUTATION_COMPLETED' && (
                  <button onClick={() => { setConfirmAction('release'); setConfirmOpen(true); }} className="btn-primary w-full !py-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Release Funds to Seller
                  </button>
                )}

                {/* ADMIN: Refund */}
                {user?.role === 'ADMIN' && isRefundable && (
                  <button onClick={() => { setConfirmAction('refund'); setConfirmOpen(true); }} className="btn-danger w-full !py-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    Refund Buyer
                  </button>
                )}

                {/* No actions available */}
                {user?.role === 'BUYER' && transaction.status !== 'PENDING' && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-500 text-center">
                    No actions required from you at this stage. Waiting for seller or admin.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Uploaded documents */}
          {transaction.mutationDocuments?.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Mutation Documents</h2>
              <div className="space-y-3">
                {transaction.mutationDocuments.map((doc, i) => (
                  <div key={i} className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{doc.description || `Document ${i + 1}`}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : ''}</p>
                    </div>
                    {doc.documentUrl && !doc.documentUrl.startsWith('data:') && (
                      <a href={doc.documentUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex-shrink-0">
                        Open →
                      </a>
                    )}
                    {doc.documentUrl?.startsWith('data:') && (
                      <span className="text-xs text-slate-400 flex-shrink-0">File uploaded</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-5">

          {/* Escrow account */}
          <div className="card-tinted p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary-600">Escrow Account</p>
                <p className="text-sm font-mono font-semibold text-slate-700">{transaction.escrowAccount?.accountNumber || 'N/A'}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Balance</span>
                <span className="font-bold text-slate-900">${Number(transaction.escrowAccount?.balance || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Currency</span>
                <span className="font-semibold text-slate-700">{transaction.escrowAccount?.currency || 'USD'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <StatusBadge status={transaction.escrowAccount?.status || 'ACTIVE'} />
              </div>
            </div>
          </div>

          {/* Transaction summary */}
          <div className="card p-6">
            <h2 className="text-base font-bold text-slate-900 mb-4">Transaction Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-start">
                <span className="text-slate-500">Property</span>
                <span className="font-semibold text-slate-800 text-right max-w-[55%]">{transaction.property?.title || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount</span>
                <span className="font-bold text-slate-900">${Number(transaction.amount).toLocaleString()}</span>
              </div>
              <div className="section-divider my-1" />
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Buyer</span>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full gradient-accent flex items-center justify-center text-white text-xs font-bold">
                    {transaction.buyer?.name?.charAt(0) || 'B'}
                  </div>
                  <span className="font-semibold text-slate-800">{transaction.buyer?.name || 'N/A'}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Seller</span>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                    {transaction.seller?.name?.charAt(0) || 'S'}
                  </div>
                  <span className="font-semibold text-slate-800">{transaction.seller?.name || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Final state notice */}
          {isFinal && (
            <div className={`card p-5 border-2 ${transaction.status === 'FUNDS_RELEASED' ? 'border-primary-200 bg-primary-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${transaction.status === 'FUNDS_RELEASED' ? 'bg-primary-100' : 'bg-red-100'}`}>
                  <svg className={`w-5 h-5 ${transaction.status === 'FUNDS_RELEASED' ? 'text-primary-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={transaction.status === 'FUNDS_RELEASED' ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                  </svg>
                </div>
                <div>
                  <p className={`text-sm font-bold ${transaction.status === 'FUNDS_RELEASED' ? 'text-primary-800' : 'text-red-800'}`}>
                    {transaction.status === 'FUNDS_RELEASED' ? 'Transaction Complete' : 'Transaction Refunded'}
                  </p>
                  <p className={`text-xs mt-0.5 ${transaction.status === 'FUNDS_RELEASED' ? 'text-primary-600' : 'text-red-600'}`}>
                    {transaction.status === 'FUNDS_RELEASED' ? 'Funds released to seller. Property sold.' : 'Buyer refunded. Property is available again.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => handleAction(`/transactions/${id}/${confirmAction === 'release' ? 'release' : 'refund'}`)}
        title={confirmAction === 'release' ? 'Release funds to seller' : 'Refund buyer'}
        message={confirmAction === 'release'
          ? `This will transfer $${Number(transaction.amount).toLocaleString()} to the seller and mark the property as SOLD. This cannot be undone.`
          : `This will refund $${Number(transaction.escrowAccount?.balance || 0).toLocaleString()} to the buyer and mark the property as AVAILABLE again.`
        }
        confirmText={confirmAction === 'release' ? 'Release Funds' : 'Refund Buyer'}
        danger={confirmAction === 'refund'}
        loading={actionLoading}
      />
    </div>
  );
};

export default TransactionDetail;
