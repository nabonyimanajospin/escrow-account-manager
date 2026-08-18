import { useState, useEffect, useCallback } from 'react';
import axios from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const KYCPage = () => {
  const { user, refreshUser } = useAuth();
  const [kycFile, setKycFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [nationalId, setNationalId] = useState('');
  const [rdbLoading, setRdbLoading] = useState(false);
  const [pendingList, setPendingList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const isAdmin = user?.role === 'ADMIN';
  const isVerified = Boolean(user?.isKycVerified);
  const awaitingReview = !isVerified && Boolean(user?.kycDocumentUrl);

  const fetchPending = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoadingList(true);
      const res = await axios.get('/kyc/pending');
      setPendingList(res.data.data || []);
    } catch {
      toast.error('Failed to load pending KYC submissions.');
    } finally {
      setLoadingList(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleSubmitKyc = async (e) => {
    e.preventDefault();
    if (!kycFile) {
      toast.error('Please select an identity document to upload.');
      return;
    }
    const formData = new FormData();
    formData.append('document', kycFile);
    try {
      setSubmitting(true);
      await axios.post('/kyc/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Document submitted. An admin will review it shortly.');
      setKycFile(null);
      await refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRdbVerify = async (e) => {
    e.preventDefault();
    const cleanedId = nationalId.replace(/\s/g, '');
    if (!/^\d{16}$/.test(cleanedId)) {
      toast.error('Enter a valid 16-digit Rwanda National ID number.');
      return;
    }
    try {
      setRdbLoading(true);
      const res = await axios.post('/integrations/rdb/kyc-verify', { nationalId: cleanedId });
      if (res.data?.success && res.data?.isKycVerified) {
        toast.success('Identity verified instantly via RDB registry.');
        setNationalId('');
        await refreshUser();
      } else {
        toast.error('Could not verify this National ID. Try document upload instead.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'RDB verification failed.');
    } finally {
      setRdbLoading(false);
    }
  };

  const handleApprove = async (userId, name) => {
    try {
      setActionLoading(true);
      await axios.post(`/kyc/${userId}/approve`);
      toast.success(`KYC approved for ${name}.`);
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason.');
      return;
    }
    try {
      setActionLoading(true);
      await axios.post(`/kyc/${rejectModal.userId}/reject`, { reason: rejectReason });
      toast.success(`KYC rejected for ${rejectModal.name}.`);
      setRejectModal(null);
      setRejectReason('');
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection failed.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="page-wrapper dashboard-wrapper space-y-7 animate-fade-in">

      <div className="card-tinted p-6">
        <h1 className="text-2xl font-extrabold text-slate-900">
          {isAdmin ? 'KYC Verification Management' : 'Identity Verification (KYC)'}
        </h1>
        <p className="text-slate-500 mt-1 text-sm font-semibold">
          {isAdmin
            ? 'Review and approve or reject pending identity verification submissions.'
            : 'One-time identity check required before buying or bidding. After approval, you will not need to repeat this.'}
        </p>
      </div>

      {!isAdmin && (
        <div className="card p-6 bg-white space-y-5">
          {isVerified ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Verified</span>
              <div>
                <p className="text-sm font-bold text-emerald-800">Identity Verified — one-time complete</p>
                <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                  Your account was verified on {new Date(user.kycVerifiedAt).toLocaleDateString()}.
                  {user.nationalIdNumber ? ` National ID ending ••••${String(user.nationalIdNumber).slice(-4)}.` : ''}
                </p>
              </div>
            </div>
          ) : awaitingReview ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
              <p className="text-xs font-bold text-blue-800">Document submitted — awaiting admin review</p>
              <p className="text-xs text-blue-700 font-semibold leading-relaxed">
                Your identity document has been received. A platform administrator will review it and notify you by email and in-app notification. This usually takes 1–2 business days.
              </p>
              <p className="text-[10px] text-blue-600 font-medium">
                KYC is required only once. After approval, you can buy and bid without repeating this step.
              </p>
            </div>
          ) : (
            <>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs font-bold text-amber-800">KYC not yet completed</p>
                <p className="text-xs text-amber-700 font-semibold mt-1 leading-relaxed">
                  Choose instant verification with your Rwanda National ID, or upload a government ID (National ID, Passport, or Driving License) for admin review.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div>
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Option A — Instant verify (RDB)</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">
                    Validates your 16-digit National ID against the RDB identity registry socket (demo simulation).
                  </p>
                </div>
                <form onSubmit={handleRdbVerify} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={16}
                    className="input-field flex-1 font-mono tracking-wide"
                    placeholder="1199 0801 2345 6789"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value.replace(/\D/g, '').slice(0, 16))}
                    disabled={rdbLoading}
                  />
                  <button type="submit" disabled={rdbLoading || nationalId.length < 16} className="btn-primary text-sm whitespace-nowrap disabled:opacity-50">
                    {rdbLoading ? 'Verifying...' : 'Verify instantly'}
                  </button>
                </form>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-400 font-bold">or</span>
                </div>
              </div>

              <form onSubmit={handleSubmitKyc} className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Option B — Upload document (admin review)</p>
                  <p className="text-[10px] text-slate-500 font-medium mb-3">
                    An administrator will open your document, verify it, and approve or reject with a reason.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Identity Document
                  </label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setKycFile(e.target.files[0] || null)}
                    disabled={submitting}
                    className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-xl file:border-0
                      file:text-sm file:font-semibold
                      file:bg-primary-50 file:text-primary-700
                      hover:file:bg-primary-100 cursor-pointer"
                  />
                  {kycFile && (
                    <p className="text-xs text-emerald-600 font-bold">✓ {kycFile.name}</p>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                  Accepted formats: JPG, PNG, PDF. Max size: 10MB. Stored securely and reviewed only by administrators.
                </p>
                <button
                  type="submit"
                  disabled={submitting || !kycFile}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit for admin review'}
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="card p-6 bg-white space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest">
              Pending Submissions
            </h2>
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
              {pendingList.length} Pending
            </span>
          </div>

          {loadingList ? (
            <p className="text-xs text-slate-400 text-center py-8 font-semibold">Loading submissions...</p>
          ) : pendingList.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8 font-semibold italic">No pending KYC submissions.</p>
          ) : (
            <div className="space-y-3">
              {pendingList.map((u) => (
                <div key={u.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-900">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      u.role === 'SELLER' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {u.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {u.kycDocumentUrl && (
                      <a
                        href={u.kycDocumentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-primary-600 hover:underline"
                      >
                        View Document ↗
                      </a>
                    )}
                    <button
                      onClick={() => handleApprove(u.id, u.name)}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => { setRejectReason(''); setRejectModal({ userId: u.id, name: u.name }); }}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-scale-in">
            <h3 className="text-sm font-bold text-slate-900">Reject KYC — {rejectModal.name}</h3>
            <p className="text-xs text-slate-500 font-medium">
              The user will be notified with your reason and asked to resubmit.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rejection Reason (Required)</label>
              <textarea
                className="w-full border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 resize-none h-24 focus:outline-none focus:ring-2 focus:ring-red-300"
                placeholder="e.g. Document is blurry, expired ID, name mismatch..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)} className="flex-1 btn-secondary text-xs !py-2">Cancel</button>
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectReason.trim() || actionLoading}
                className="flex-1 text-xs py-2 font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white border border-red-600 transition-all cursor-pointer disabled:opacity-40"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default KYCPage;
