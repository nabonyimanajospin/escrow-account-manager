import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import AuditLog from '../components/AuditLog';
import toast from 'react-hot-toast';
import { resolveImageUrl } from '../utils/imageUtils';
import EscrowTimeline from '../components/escrow/EscrowTimeline';
import EscrowLedger from '../components/escrow/EscrowLedger';
import ContractPreviewModal from '../components/escrow/ContractPreviewModal';
import TransactionJournal from '../components/escrow/TransactionJournal';
import { SkeletonCard } from '../components/common/SkeletonLoader';
import { getEscrowNextStep, toneClasses } from '../utils/escrowSteps';

const EscrowDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Form states
  const [consensusCode, setConsensusCode] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docDesc, setDocDesc] = useState('');
  const [docUploadMode, setDocUploadMode] = useState('file'); // 'file' (recommended) or 'link'
  const [uploadedDocFile, setUploadedDocFile] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [validationReport, setValidationReport] = useState(null);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceDesc, setEvidenceDesc] = useState('');
  const [arbitrationNotes, setArbitrationNotes] = useState('');

  // Document analysis state
  const [docAnalysisReport, setDocAnalysisReport] = useState(null);
  const [docAnalysisLoading, setDocAnalysisLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);

  const handleDocFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File is too large. Please select a document under 10MB.');
        e.target.value = '';
        return;
      }
      setUploadedDocFile(file);
    }
  };

  const formatTime = (seconds) => {
    if (seconds === null) return '';
    if (seconds <= 0) return 'EXPIRED';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const fetchTransaction = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/escrow/${id}`);
      setTransaction(response.data.data);
      if (response.data.data.registryValidationReport) {
        setValidationReport(response.data.data.registryValidationReport);
      } else {
        setValidationReport(null);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load transaction details');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  useEffect(() => {
    if (!user || user.role === 'ADMIN') return;
    axios.get('/wallet')
      .then((res) => setWalletBalance(res.data.wallet?.balance ?? 0))
      .catch(() => setWalletBalance(null));
  }, [user, transaction?.status]);

  useEffect(() => {
    if (transaction && transaction.status === 'PENDING') {
      const calculateTimeLeft = () => {
        const EXPIRATION_LIMIT = 24 * 60 * 60 * 1000; // 24 hours (matches backend cron default)
        const createdTime = new Date(transaction.createdAt).getTime();
        const difference = (createdTime + EXPIRATION_LIMIT) - Date.now();
        if (difference <= 0) {
          setTimeLeft(0);
          fetchTransaction();
          return;
        }
        setTimeLeft(Math.floor(difference / 1000));
      };
      calculateTimeLeft();
      const interval = setInterval(calculateTimeLeft, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(null);
    }
  }, [transaction, fetchTransaction]);

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!consensusCode) {
      toast.error('Please enter the 4-digit verification code');
      return;
    }
    try {
      setActionLoading(true);
      await axios.post(`/escrow/${id}/consensus-verify`, { code: consensusCode });
      toast.success('Agreement successfully signed and authorized');
      setConsensusCode('');
      fetchTransaction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeposit = async () => {
    const total = Number(transaction.amount) + Number(transaction.buyerFee || 0);
    if (!window.confirm(`Confirm escrow deposit of $${total.toLocaleString()} from your platform wallet?`)) return;

    try {
      setActionLoading(true);
      const res = await axios.post(`/escrow/${id}/deposit`, {
        amount: total,
        reference: `DEP-${Date.now()}`,
      });
      toast.success(res.data.message || 'Funds successfully deposited and locked in escrow!');
      await fetchTransaction();
      if (user?.role === 'BUYER') {
        axios.get('/wallet')
          .then((w) => setWalletBalance(w.data.wallet?.balance ?? 0))
          .catch(() => {});
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Deposit processing failed';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleInitiateMutation = async () => {
    try {
      setActionLoading(true);
      await axios.post(`/escrow/${id}/initiate-mutation`);
      toast.success('Ownership mutation process initiated');
      fetchTransaction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate mutation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadDoc = async (e) => {
    e.preventDefault();
    if (!docDesc) {
      toast.error('Please provide a document description');
      return;
    }
    if (docUploadMode === 'file' && !uploadedDocFile) {
      toast.error('Please select a file to upload');
      return;
    }
    if (docUploadMode === 'link' && !docUrl) {
      toast.error('Please enter a document URL');
      return;
    }
    try {
      setActionLoading(true);
      if (docUploadMode === 'file') {
        // Use multipart upload — backend stores file and returns path
        const formData = new FormData();
        formData.append('document', uploadedDocFile);
        formData.append('description', docDesc);
        const uploadRes = await axios.post(`/escrow/${id}/upload-mutation-file`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Mutation document uploaded');
      } else {
        await axios.post(`/escrow/${id}/upload-document`, {
          documentUrl: docUrl,
          description: docDesc,
        });
        toast.success('Mutation document uploaded');
      }
      setDocUrl('');
      setUploadedDocFile(null);
      setDocDesc('');
      fetchTransaction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Document upload failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteMutation = async () => {
    try {
      setActionLoading(true);
      await axios.post(`/escrow/${id}/complete-mutation`);
      toast.success('Mutation completed. Awaiting Admin Review.');
      fetchTransaction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Mutation completion submission failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this transaction? Any deposited funds will be returned to the buyer.')) return;
    try {
      setActionLoading(true);
      await axios.post(`/escrow/${id}/cancel`);
      toast.success('Transaction successfully cancelled');
      fetchTransaction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancellation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyConsensusCode = async (e) => {
    e.preventDefault();
    if (!consensusCode || !consensusCode.trim()) {
      toast.error('Please enter your verification code');
      return;
    }
    try {
      setActionLoading(true);
      await axios.post(`/escrow/${id}/consensus-verify`, { code: consensusCode.trim() });
      toast.success('Verification code approved! Digital consensus signature registered.');
      setConsensusCode('');
      fetchTransaction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setActionLoading(true);
      await axios.post(`/escrow/${id}/resend-otp`);
      toast.success('Fresh OTP sent to your notifications, email, and phone (if registered).');
      fetchTransaction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Document analysis ──────────────────────────────────────────────────
  const handleAnalyzeDocument = async () => {
    try {
      setDocAnalysisLoading(true);
      toast.loading('Analyzing document...', { id: 'doc-analysis' });
      const res = await axios.post(`/escrow/${id}/analyze-document`);
      setDocAnalysisReport(res.data.analysis);
      toast.dismiss('doc-analysis');
      const v = res.data.analysis?.verdict;
      if (v === 'LIKELY_VALID') toast.success('Document appears valid');
      else if (v === 'NEEDS_REVIEW') toast.error('Document needs admin review');
      else toast.error('Document flagged for review');
    } catch (err) {
      toast.dismiss('doc-analysis');
      toast.error(err.response?.data?.message || 'Document analysis failed');
    } finally {
      setDocAnalysisLoading(false);
    }
  };


  const handleConfirmReceipt = async () => {
    if (!window.confirm('Do you want to confirm that you have successfully received the released payout funds? This will permanently close the escrow agreement and transfer property deed ownership.')) return;
    try {
      setActionLoading(true);
      await axios.post(`/escrow/${id}/confirm-receipt`);
      toast.success('Funds receipt confirmed. Transaction completed successfully.');
      fetchTransaction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Confirmation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyRegistry = async () => {
    if (!window.confirm('Do you want to run the automated land deeds verification registry check? This will cross-reference the uploaded document with official public government records.')) return;
    try {
      setActionLoading(true);
      setValidationReport(null);
      const response = await axios.post(`/escrow/${id}/verify-registry`);
      toast.success(response.data.message);
      if (response.data.report) {
        setValidationReport(response.data.report);
      }
      fetchTransaction();
    } catch (err) {
      if (err.response?.data?.report) {
        setValidationReport(err.response.data.report);
        toast.error('Government Registry matched validation check failed: document structure is invalid.');
      } else {
        toast.error(err.response?.data?.message || 'Verification check failed');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyDeedTemplate = () => {
    const templateText = `DEED OF OWNERSHIP TRANSFER
PROPERTY ID: ${transaction.propertyId}
PROPERTY TITLE: ${transaction.property?.title}
PROPERTY LOCATION: ${transaction.property?.location}
SELLER: ${transaction.seller?.name}
BUYER: ${transaction.buyer?.name}
MUTATION PRICE: $${Number(transaction.amount).toLocaleString()} USD
UNIQUE PARCEL IDENTIFIER: ${transaction.property?.upiCode || '1/03/01/04/1000'}
DATE: ${new Date().toLocaleDateString()}
STATUS: COMPLETED MUTATION`;

    navigator.clipboard.writeText(templateText);
    toast.success('Deed Template text copied to clipboard! You can paste this into a text file (.txt) and upload it to pass the automated registry checks.');
  };

  const handlePrintDeed = () => {
    const printContent = document.getElementById('printable-deed').innerHTML;
    
    // Create or locate a hidden iframe to prevent popup blocker blocking window.open
    let iframe = document.getElementById('print-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'print-iframe';
      iframe.style.position = 'absolute';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
    }
    
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Deed of Sale - ${transaction.transactionId}</title>
          <style>
            body { 
              font-family: 'Georgia', 'Times New Roman', serif; 
              padding: 40px; 
              color: #1a202c; 
              background: #ffffff;
              line-height: 1.6;
            }
            .text-center { text-align: center; }
            .space-y-4 > * + * { margin-top: 16px; }
            .space-y-3 > * + * { margin-top: 12px; }
            .space-y-1 > * + * { margin-top: 4px; }
            .border-b { border-bottom: 2px solid #1a202c; }
            .border-t { border-top: 1px solid #cbd5e0; }
            .pb-4 { padding-bottom: 16px; }
            .pt-4 { padding-top: 16px; }
            .text-md { font-size: 16px; }
            .text-xs { font-size: 12px; }
            .font-bold { font-weight: bold; }
            .font-mono { font-family: Courier, monospace; font-size: 11px; }
            .uppercase { text-transform: uppercase; }
            .tracking-widest { letter-spacing: 0.1em; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
            .bg-white { background: #ffffff; }
            .p-3 { padding: 12px; border: 1px solid #a0aec0; border-radius: 6px; }
            .flex { display: flex; justify-content: space-between; }
            .bg-slate-50 { background: #f7fafc; }
            .border-slate-300 { border-color: #cbd5e0; }
            .border-slate-200 { border-color: #e2e8f0; }
            .border-slate-100 { border-color: #edf2f7; }
            .text-slate-400 { color: #a0aec0; }
            .text-slate-500 { color: #718096; }
            .text-slate-800 { color: #2d3748; }
            .text-[9px] { font-size: 10px; }
            .text-[10px] { font-size: 11px; }
            .mb-1 { margin-bottom: 4px; }
            .mt-2 { margin-top: 8px; }
            .pt-2 { padding-top: 8px; }
            .px-4 { padding-left: 16px; padding-right: 16px; }
            .leading-none { line-height: 1; }
            .bg-emerald-50 { background-color: #ecfdf5; }
            .text-emerald-600 { color: #059669; }
            .border-emerald-200 { border-color: #a7f3d0; }
            .bg-slate-100 { background-color: #f1f5f9; }
            .text-slate-700 { color: #334155; }
            .text-slate-800 { color: #1e293b; }
            .border { border: 1px solid #cbd5e0; }
            .rounded { border-radius: 4px; }
            .px-2 { padding-left: 8px; padding-right: 8px; }
            .py-1 { padding-top: 4px; padding-bottom: 4px; }
            .p-2 { padding: 8px; }
            .inline-flex { display: inline-flex; }
            .flex-col { flex-direction: column; }
            .items-center { align-items: center; }
            .items-end { align-items: flex-end; }
            .text-[8px] { font-size: 8px; }
            .text-[7px] { font-size: 7px; }
            .shrink-0 { flex-shrink: 0; }
            .gap-3 { gap: 12px; }
            .gap-2 { gap: 8px; }
            .text-primary-600 { color: #2563eb; }
            .hover\\:underline { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div style="max-width: 700px; margin: 0 auto; border: 4px double #1a202c; padding: 30px; border-radius: 8px;">
            ${printContent}
          </div>
        </body>
      </html>
    `);
    doc.close();
    
    // Focus and print after content has loaded
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 300);
  };

  const handleRaiseDispute = async (e) => {
    e.preventDefault();
    if (!disputeReason.trim()) return;
    try {
      setActionLoading(true);
      const response = await axios.post(`/escrow/${id}/dispute`, { reason: disputeReason });
      toast.success('Dispute case successfully opened. Escrow funds locked.');
      setDisputeReason('');
      fetchTransaction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to file dispute');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadEvidence = async (e) => {
    e.preventDefault();
    if (!evidenceUrl.trim()) return;
    try {
      setActionLoading(true);
      await axios.post(`/escrow/${id}/dispute/evidence`, {
        fileUrl: evidenceUrl,
        description: evidenceDesc || 'Evidence proof attachment'
      });
      toast.success('Evidence file uploaded successfully.');
      setEvidenceUrl('');
      setEvidenceDesc('');
      fetchTransaction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload evidence');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveDispute = async (decision) => {
    if (!arbitrationNotes.trim()) {
      toast.error('Please enter the arbitrator ruling reason');
      return;
    }
    if (!window.confirm(`Are you sure you want to resolve this dispute in favor of ${decision === 'RELEASE_TO_SELLER' ? 'Seller' : 'Buyer'}?`)) return;
    try {
      setActionLoading(true);
      await axios.post(`/escrow/${id}/dispute/resolve`, {
        decision,
        mediatorNotes: arbitrationNotes
      });
      toast.success(`Dispute successfully resolved.`);
      setArbitrationNotes('');
      fetchTransaction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resolve dispute');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMediateDispute = async () => {
    if (!window.confirm('Confirm that you are initiating an active mediation investigation for this dispute case?')) return;
    try {
      setActionLoading(true);
      await axios.post(`/escrow/${id}/dispute/mediate`);
      toast.success('Dispute case status updated to UNDER_MEDIATION.');
      fetchTransaction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate active mediation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmPropertyReceipt = async () => {
    if (!window.confirm('Confirm that you have physically/digitally received the property mutation ownership deed document transfer?')) return;
    try {
      setActionLoading(true);
      await axios.post(`/escrow/${id}/confirm-property-receipt`);
      toast.success('Property deed receipt successfully confirmed.');
      fetchTransaction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Receipt confirmation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdminRelease = async () => {
    if (!arbitrationNotes.trim()) {
      toast.error('Please enter the administrative audit review notes');
      return;
    }
    if (!window.confirm('Confirm release of escrow funds to the seller?')) return;
    try {
      setActionLoading(true);
      await axios.post(`/admin/transactions/${id}/release`, { adminNotes: arbitrationNotes });
      toast.success('Escrow funds successfully approved and released');
      setArbitrationNotes('');
      fetchTransaction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Release failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdminRefund = async () => {
    if (!arbitrationNotes.trim()) {
      toast.error('Please enter the administrative audit review notes for refunding');
      return;
    }
    if (!window.confirm('Confirm rejection and refund of escrow funds to the buyer?')) return;
    try {
      setActionLoading(true);
      await axios.post(`/admin/transactions/${id}/refund`, { adminNotes: arbitrationNotes });
      toast.success('Escrow funds successfully refunded to buyer');
      setArbitrationNotes('');
      fetchTransaction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Refund failed');
    } finally {
      setActionLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="page-wrapper max-w-7xl mx-auto space-y-6 animate-fade-in">
        <div className="h-10 w-64 bg-slate-200 rounded animate-pulse mb-6"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="space-y-6">
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  const { status, buyerAuthorized, sellerAuthorized } = transaction;
  const mutationDocCount = transaction.mutationDocuments?.length ?? 0;

  // Determine current active lifecycle step index
  // Determine current active lifecycle step index
  const states = ['PENDING', 'FUNDED', 'MUTATION_STARTED', 'UNDER_REVIEW', 'AWAITING_RECEIPT', 'COMPLETED'];
  let currentStep = states.indexOf(status);
  if (status === 'REFUNDED') currentStep = -1; // special cancel case
  if (status === 'DISPUTED') currentStep = -2; // special dispute case

  const isBuyer = user?.id === transaction.buyerId;
  const isSeller = user?.id === transaction.sellerId;
  const userHasSigned = (isBuyer && buyerAuthorized) || (isSeller && sellerAuthorized);
  
  // Simple non-Node browser-safe hashing function for mock signatures
  const getMockHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  };

  const buyerSignature = transaction.buyerSignature;
  const sellerSignature = transaction.sellerSignature;

  return (
    <div className="page-wrapper dashboard-wrapper space-y-7 animate-fade-in">
      
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Link to="/dashboard" className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5">
          &larr; Back to Dashboard
        </Link>
        <span className="text-xs text-slate-400 font-mono">Deal Reference: {transaction.transactionId}</span>
      </div>

      {(() => {
        const next = getEscrowNextStep(transaction, user);
        if (!next) return null;
        return (
          <div className={`p-4 rounded-xl border ${toneClasses[next.tone] || toneClasses.slate}`}>
            <p className="text-sm font-bold">Next step: {next.title}</p>
            <p className="text-xs font-medium mt-1 opacity-90">{next.detail}</p>
          </div>
        );
      })()}

      <EscrowTimeline status={status} />
      <EscrowLedger transaction={transaction} />

      {/* Top Workspace Tab Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all ${
              activeTab === 'overview'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Escrow Overview & Actions
          </button>

          <button
            onClick={() => setActiveTab('journal')}
            className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'journal'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>📊 Auditable Accounting Journal</span>
          </button>
        </div>

        <button
          onClick={() => setIsContractModalOpen(true)}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-xl border border-amber-300 transition-all shadow-sm flex items-center gap-1.5 transform hover:scale-[1.02]"
        >
          <span>✨ View Stamped Contract & AI Explainer</span>
        </button>
      </div>

      {activeTab === 'journal' ? (
        <TransactionJournal transactionId={transaction.id} />
      ) : (
        /* 2. TRANSACTION AND ACCOUNT DETAILS SPLIT */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Side: Escrow Account details & action items */}
          <div className="lg:col-span-2 space-y-6">

            {/* DIGITAL AGREEMENT CONTRACT CARD */}
            <div className="card p-6 bg-white relative overflow-hidden">
              {status === 'COMPLETED' && (
                <div className="absolute inset-0 bg-emerald-50/10 border-2 border-emerald-500 rounded-xl pointer-events-none flex items-center justify-center">
                  <span className="transform -rotate-12 border-4 border-emerald-500 text-emerald-500 font-extrabold uppercase px-6 py-2 tracking-widest text-2xl bg-white rounded-xl shadow-md">
                    Cryptographically Sealed
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-md font-bold text-slate-900 font-sans">Digital Escrow Agreement</h3>
                <button
                  onClick={() => setIsContractModalOpen(true)}
                  className="text-[11px] font-extrabold bg-amber-500/10 text-amber-800 border border-amber-300 px-3 py-1 rounded-lg hover:bg-amber-500/20 transition flex items-center gap-1"
                >
                  <span>✨ Open Contract Explainer & QR</span>
                </button>
              </div>

            {/* Contract terms content */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-semibold space-y-2 leading-relaxed max-h-[160px] overflow-y-auto">
              <p>
                This digital escrow agreement is binding between the Buyer (<strong>{transaction.buyer?.name}</strong>) and the Seller (<strong>{transaction.seller?.name}</strong>) under the arbitration of the System Escrow Administrator for the real estate property <strong>"{transaction.property?.title}"</strong>.
              </p>
              <p>
                <strong>TERMS OF AGREEMENT:</strong>
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-500 font-medium">
                <li>The Buyer contracts online to lock the transaction value of <strong>${Number(transaction.amount).toLocaleString()} USD</strong> into Escrow Contract Address <strong>{transaction.escrowAccount?.contractAddress}</strong>.</li>
                <li>The Seller guarantees the structural specs and ownership rights of the property and initiates the legal ownership transfer (mutation) upon funding verification.</li>
                <li>The Escrow funds are locked securely. No payout is processed until mutation documents are uploaded and verified by the designated Admin audit.</li>
                <li>If ownership mutation is verified, funds are settled directly to the Seller. In the event of mutation failure, funds are refunded to the Buyer.</li>
              </ul>
            </div>

            {/* Cryptographic Signature Displays */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-100">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl leading-snug">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Buyer Digital Signature</p>
                {buyerAuthorized ? (
                  <div className="mt-1 font-mono text-[10px] font-bold text-emerald-600 break-all bg-emerald-50/50 p-1.5 rounded border border-emerald-100">
                    {buyerSignature}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 font-semibold mt-1">Awaiting Buyer cryptographical signature...</p>
                )}
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl leading-snug">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Seller Digital Signature</p>
                {sellerAuthorized ? (
                  <div className="mt-1 font-mono text-[10px] font-bold text-emerald-600 break-all bg-emerald-50/50 p-1.5 rounded border border-emerald-100">
                    {sellerSignature}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 font-semibold mt-1">Awaiting Seller cryptographical signature...</p>
                )}
              </div>
            </div>



            {/* Waiting for other party indicator */}
            {userHasSigned && ['PENDING', 'FUNDED', 'MUTATION_STARTED'].includes(status) && (
              <div className="mt-5 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-center text-xs font-semibold leading-relaxed">
                You have signed. Awaiting counterparty cryptographic signature for code {transaction.verificationCode}...
              </div>
            )}

          </div>

          {/* WORKSPACE ACTIONS INTERFACE */}
          <div className="card p-6 bg-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-md font-bold text-slate-900 font-sans">Workspace Actions</h3>
              <StatusBadge status={status} />
            </div>

            {/* OTP Consensus Verification Card */}
            {((isBuyer && !buyerAuthorized) || (isSeller && !sellerAuthorized)) && status !== 'COMPLETED' && status !== 'CANCELLED' && (
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-primary-600">OTP</span>
                    <h4 className="text-xs font-bold text-indigo-950 font-sans">Verification OTP Approval Required</h4>
                  </div>
                  <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                    Check notifications
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                  Please enter the verification OTP code sent to your <strong>notification panel, email, and phone</strong> to authorize this transaction step and generate your cryptographic consensus signature.
                </p>
                <form onSubmit={handleVerifyConsensusCode} className="flex gap-2">
                  <input
                    type="text"
                    required
                    className="input-field text-xs font-mono tracking-widest uppercase !py-2 !px-3 font-bold flex-1"
                    placeholder="Enter Code (e.g. 6789)"
                    value={consensusCode}
                    onChange={(e) => setConsensusCode(e.target.value)}
                    disabled={actionLoading}
                  />
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="btn-primary text-xs py-2 px-4 font-bold cursor-pointer flex-shrink-0"
                  >
                    {actionLoading ? 'Verifying...' : 'Verify Code'}
                  </button>
                </form>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={actionLoading}
                    className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Don't see your code? Click to resend a fresh OTP to your notifications</span>
                  </button>
                </div>
              </div>
            )}

            {/* 1. Buyer Deposit action */}
            {status === 'PENDING' && (
              <div className="space-y-3">
                {timeLeft !== null && timeLeft > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg flex items-center justify-between text-xs font-bold font-sans">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-amber-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Lock Period Countdown
                    </span>
                    <span className="font-mono text-sm px-2 py-0.5 bg-white border border-amber-300 rounded text-amber-800">
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                )}
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Both parties have signed the agreement. The buyer can deposit funds into escrow to proceed.
                </p>
                {isBuyer && walletBalance !== null && (
                  <div className={`p-3 rounded-lg border text-xs font-semibold ${walletBalance >= Number(transaction.amount) + Number(transaction.buyerFee || 0) ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                    Wallet balance: <strong>${Number(walletBalance).toLocaleString()}</strong>
                    {' · '}
                    Required: <strong>${Number(Number(transaction.amount) + Number(transaction.buyerFee || 0)).toLocaleString()}</strong>
                    {walletBalance < Number(transaction.amount) + Number(transaction.buyerFee || 0) && (
                      <span className="block mt-1">Balance is low — the system will auto-top-up for demo deposits if needed.</span>
                    )}
                  </div>
                )}
                {isBuyer ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleDeposit}
                      disabled={actionLoading}
                      className="btn-primary text-xs cursor-pointer font-bold"
                    >
                      {actionLoading ? 'Locking Funds...' : 'Confirm Escrow Deposit ($' + Number(Number(transaction.amount) + Number(transaction.buyerFee || 0)).toLocaleString() + ')'}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={actionLoading}
                      className="btn-secondary text-xs hover:text-red-600 hover:border-red-200"
                    >
                      Cancel Agreement
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-400 italic">
                    ⏳ Awaiting Buyer {transaction.buyer?.name} to deposit funds (Total: ${Number(Number(transaction.amount) + Number(transaction.buyerFee || 0)).toLocaleString()} including platform charge) into the escrow account...
                  </div>
                )}
              </div>
            )}

            {/* 2. Seller starts mutation */}
            {status === 'FUNDED' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Escrow holds locked deposit of <strong>${Number(Number(transaction.amount) + Number(transaction.buyerFee || 0)).toLocaleString()} USD</strong>. The Seller must initiate ownership mutation.
                </p>
                <div className="flex items-center gap-3">
                  {isSeller ? (
                    <button
                      onClick={handleInitiateMutation}
                      disabled={actionLoading}
                      className="btn-primary text-xs font-bold shadow-md hover:shadow-lg transition-all"
                    >
                      Start Ownership Mutation
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-slate-400 italic">Waiting for Seller to start mutation...</span>
                  )}
                  {isBuyer && (
                    <button
                      onClick={handleCancel}
                      disabled={actionLoading}
                      className="btn-secondary text-xs hover:text-red-600 hover:border-red-200"
                    >
                      Cancel Agreement (Refund)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 3. Seller uploads documents & completes mutation */}
            {status === 'MUTATION_STARTED' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Mutation is in progress. The Seller can upload files as transfer proofs, and then submit the agreement for Admin Review.
                </p>

                {/* Seller Document Upload Form */}
                {isSeller && (
                  <form onSubmit={handleUploadDoc} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Upload Mutation Proof</p>
                    
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                      Use <strong>Upload Local Document</strong> (PDF or image), add a description, then click <strong>Upload File Proof</strong>. The file will appear in the sidebar before you submit.
                    </p>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setDocUploadMode('link')}
                        className={`px-3 py-1 text-[11px] font-bold rounded-xl border transition-all ${
                          docUploadMode === 'link'
                            ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        Use Document Link URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocUploadMode('file')}
                        className={`px-3 py-1 text-[11px] font-bold rounded-xl border transition-all ${
                          docUploadMode === 'file'
                            ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        Upload Local Document
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {docUploadMode === 'link' ? (
                        <input
                          type="text"
                          required
                          className="input-field !py-1.5 !px-3"
                          placeholder="Platform path only, e.g. /uploads/mutations/file.pdf"
                          value={docUrl}
                          onChange={(e) => setDocUrl(e.target.value)}
                          disabled={actionLoading}
                        />
                      ) : (
                        <div className="flex flex-col justify-center">
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleDocFileChange}
                            disabled={actionLoading}
                            className="block w-full text-xs text-slate-500
                              file:mr-4 file:py-1 file:px-3
                              file:rounded-xl file:border-0
                              file:text-xs file:font-semibold
                              file:bg-slate-200 file:text-slate-700
                              hover:file:bg-slate-300 cursor-pointer"
                          />
                          {uploadedDocFile && (
                            <span className="text-[10px] text-emerald-600 font-bold block mt-1">✓ {uploadedDocFile.name}</span>
                          )}
                        </div>
                      )}
                      <input
                        type="text"
                        required
                        className="input-field !py-1.5 !px-3"
                        placeholder="File Description (e.g. Draft Deed)"
                        value={docDesc}
                        onChange={(e) => setDocDesc(e.target.value)}
                        disabled={actionLoading}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="btn-secondary text-xs !py-1.5 cursor-pointer"
                    >
                      Upload File Proof
                    </button>
                  </form>
                )}

                {/* Submitting for Admin Review */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
                  {isSeller ? (
                    <button
                      onClick={handleCompleteMutation}
                      disabled={actionLoading || mutationDocCount === 0}
                      className="btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Submit for Admin Review
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-slate-400 italic">Waiting for Seller to submit transfer deeds...</span>
                  )}
                </div>

                {mutationDocCount === 0 && isSeller && (
                  <p className="text-[10px] text-red-600 font-bold leading-tight">
                    Upload at least one document using <strong>Upload Local Document</strong>, then click <strong>Upload File Proof</strong>.
                  </p>
                )}

                {mutationDocCount > 0 && isSeller && (
                  <p className="text-[10px] text-emerald-700 font-semibold leading-tight">
                    {mutationDocCount} document{mutationDocCount !== 1 ? 's' : ''} ready — you can submit for admin review.
                  </p>
                )}

                {mutationDocCount > 0 && (
                  <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5 items-start text-left">
                    <p className="text-[10px] text-primary-600 font-bold">Bypass consensus signature: automated registry verification</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleVerifyRegistry}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                      >
                        {actionLoading ? 'Connecting Government Deeds Database...' : 'Match & Verify with Land Registry API'}
                      </button>
                      
                      {isSeller && (
                        <button
                          type="button"
                          onClick={handleCopyDeedTemplate}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                        >
                          Copy deed text template
                        </button>
                      )}
                    </div>

                    {/* Report Card */}
                    {validationReport && (
                      <div className="w-full mt-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs leading-normal">
                        <p className="font-bold text-slate-700 text-[10px] uppercase tracking-wider border-b border-slate-100 pb-1">
                          Registry Document Parser Analysis:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-semibold">
                          <div className="flex items-center gap-1.5">
                            <span className={validationReport.documentTypeMatch === 'VERIFIED' ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                              {validationReport.documentTypeMatch === 'VERIFIED' ? '✓' : '✗'}
                            </span>
                            <span className="text-slate-500">Document Type:</span>
                            <span className="text-slate-800 font-mono text-[9px]">{validationReport.documentTypeMatch}</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <span className={validationReport.sellerMatch === 'VERIFIED' ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                              {validationReport.sellerMatch === 'VERIFIED' ? '✓' : '✗'}
                            </span>
                            <span className="text-slate-500">Seller Match:</span>
                            <span className="text-slate-800 font-mono text-[9px]">{validationReport.sellerMatch}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className={validationReport.buyerMatch === 'VERIFIED' ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                              {validationReport.buyerMatch === 'VERIFIED' ? '✓' : '✗'}
                            </span>
                            <span className="text-slate-500">Buyer Match:</span>
                            <span className="text-slate-800 font-mono text-[9px]">{validationReport.buyerMatch}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className={validationReport.propertyMatch === 'VERIFIED' ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                              {validationReport.propertyMatch === 'VERIFIED' ? '✓' : '✗'}
                            </span>
                            <span className="text-slate-500">Property Link:</span>
                            <span className="text-slate-800 font-mono text-[9px]">{validationReport.propertyMatch}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className={validationReport.upiFormatMatch === 'VERIFIED' ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                              {validationReport.upiFormatMatch === 'VERIFIED' ? '✓' : '✗'}
                            </span>
                            <span className="text-slate-500">UPI Format:</span>
                            <span className="text-slate-800 font-mono text-[9px]">{validationReport.upiFormatMatch}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className={validationReport.registryRecordFound === 'VERIFIED' ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                              {validationReport.registryRecordFound === 'VERIFIED' ? '✓' : '✗'}
                            </span>
                            <span className="text-slate-500">Registry Record:</span>
                            <span className="text-slate-800 font-mono text-[9px]">{validationReport.registryRecordFound}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className={validationReport.registryOwnerVerified === 'VERIFIED' ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                              {validationReport.registryOwnerVerified === 'VERIFIED' ? '✓' : '✗'}
                            </span>
                            <span className="text-slate-500">Owner Verification:</span>
                            <span className="text-slate-800 font-mono text-[9px]">{validationReport.registryOwnerVerified}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className={validationReport.registryStatusClean === 'VERIFIED' ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                              {validationReport.registryStatusClean === 'VERIFIED' ? '✓' : '✗'}
                            </span>
                            <span className="text-slate-500">Caveat Status:</span>
                            <span className="text-slate-800 font-mono text-[9px]">{validationReport.registryStatusClean}</span>
                          </div>
                        </div>

                        {Object.values(validationReport).includes('FAILED') ? (
                          <p className="text-[10px] text-red-500 font-bold mt-1">
                            Document verification rejected. Please generate and upload a document matching the template.
                          </p>
                        ) : (
                          <p className="text-[10px] text-emerald-600 font-bold mt-1">
                            ✓ Document structure verified. Bypass successfully completed.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Document authenticity analysis ─────────────────────── */}
            {isSeller && status === 'MUTATION_STARTED' && transaction.mutationDocuments?.length > 0 && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-purple-900">Document authenticity check</p>
                    <p className="text-[10px] text-purple-600 font-semibold mt-0.5">
                      Scans your uploaded document for UPI code, owner name, and fraud signals.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAnalyzeDocument}
                    disabled={docAnalysisLoading}
                    className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
                  >
                    {docAnalysisLoading ? 'Analyzing...' : 'Run document analysis'}
                  </button>
                </div>
                {docAnalysisReport && (
                  <div className="bg-white border border-purple-100 rounded-xl p-4 space-y-3 mt-3">
                    <div className={`flex items-center justify-between rounded-lg px-4 py-2.5 ${
                      docAnalysisReport.verdict === 'LIKELY_VALID' ? 'bg-emerald-50 border border-emerald-200'
                      : docAnalysisReport.verdict === 'NEEDS_REVIEW' ? 'bg-amber-50 border border-amber-200'
                      : 'bg-red-50 border border-red-200'
                    }`}>
                      <span className={`text-sm font-extrabold ${docAnalysisReport.verdict === 'LIKELY_VALID' ? 'text-emerald-700' : docAnalysisReport.verdict === 'NEEDS_REVIEW' ? 'text-amber-700' : 'text-red-700'}`}>
                        {docAnalysisReport.verdict === 'LIKELY_VALID' && 'Document appears valid'}
                        {docAnalysisReport.verdict === 'NEEDS_REVIEW' && 'Admin review required'}
                        {docAnalysisReport.verdict === 'SUSPICIOUS' && 'Document is suspicious'}
                      </span>
                      <span className={`text-2xl font-black ${parseInt(docAnalysisReport.confidence) >= 80 ? 'text-emerald-600' : parseInt(docAnalysisReport.confidence) >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                        {docAnalysisReport.confidence}
                      </span>
                    </div>
                    {docAnalysisReport.findings?.extractedUpi && (
                      <p className="text-[10px] font-mono text-slate-700">UPI Detected: <strong>{docAnalysisReport.findings.extractedUpi}</strong></p>
                    )}
                    {docAnalysisReport.findings?.extractedOwner && (
                      <p className="text-[10px] text-slate-700">Owner: <strong>{docAnalysisReport.findings.extractedOwner}</strong></p>
                    )}
                    {docAnalysisReport.crossChecks?.upiMatchNote && (
                      <p className="text-[10px] text-emerald-600 font-bold">{docAnalysisReport.crossChecks.upiMatchNote}</p>
                    )}
                    {docAnalysisReport.flags?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[10px] font-bold text-red-500 mb-1">Flags:</p>
                        {docAnalysisReport.flags.map((f, i) => (
                          <p key={i} className="text-[10px] text-red-600 font-semibold">• {f}</p>
                        ))}
                      </div>
                    )}
                    <p className="text-[9px] text-slate-400 font-mono mt-2">{docAnalysisReport.model} • {docAnalysisReport.processingTime}</p>
                  </div>
                )}
              </div>
            )}

            {/* Buyer Property Deed Receipt Action Card */}
            {isBuyer && ['UNDER_REVIEW', 'AWAITING_RECEIPT', 'COMPLETED'].includes(status) && (
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl leading-relaxed space-y-2.5 text-left mb-4">
                <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  Buyer mutation deed receipt signature
                </p>
                <p className="text-xs text-slate-700 leading-normal font-medium">
                  Confirm that you have legally received the ownership transfer document from the registry. This registers your digital signature on the final contract deed.
                </p>
                {transaction.buyerConfirmedPropertyReceivedAt ? (
                  <div className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                    <span>✓ Property Receipt Confirmed on {new Date(transaction.buyerConfirmedPropertyReceivedAt).toLocaleString()}</span>
                  </div>
                ) : (
                  <button
                    onClick={handleConfirmPropertyReceipt}
                    disabled={actionLoading}
                    className="btn-primary text-xs !bg-emerald-650 !bg-emerald-600 hover:!bg-emerald-700 cursor-pointer w-full md:w-auto"
                  >
                    Confirm Receipt of Property Deed
                  </button>
                )}
              </div>
            )}

            {/* 4. Under Review (Awaiting Admin) */}
            {status === 'UNDER_REVIEW' && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed text-left">
                  <p className="text-xs font-bold text-slate-800">Awaiting Administrative Audit</p>
                  <p className="text-xs text-slate-500 mt-1 leading-normal font-semibold">
                    All mutation documents have been locked and submitted. The platform administrator is verifying deeds. Escrow payout release or refund triggers shortly.
                  </p>
                </div>

                {user?.role === 'ADMIN' && (
                  <div className="p-5 bg-purple-50 border border-purple-250 rounded-xl leading-relaxed space-y-4 text-left">
                    <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                      <div className="flex items-center gap-1.5 text-purple-900 font-bold text-xs">
                        <span>Administrative audit control console</span>
                      </div>
                      <span className="text-[9px] bg-purple-200 text-purple-900 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Checklist Audit
                      </span>
                    </div>

                    {/* Checklist Requirements Indicators (informational — demo flow only requires audit notes) */}
                    <p className="text-[10px] text-purple-700 font-semibold bg-purple-100/60 border border-purple-200 rounded-lg px-2.5 py-1.5">
                      Demo mode: enter audit notes below, then use Release or Refund. Checklist items are optional.
                    </p>
                    <div className="space-y-2 text-xs font-semibold">
                      <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                        <span className="text-slate-700">1. Government Land Registry Verified</span>
                        {validationReport && validationReport.registryRecordFound === 'VERIFIED' && validationReport.upiFormatMatch === 'VERIFIED' ? (
                          <span className="text-emerald-600 flex items-center gap-1">✓ Verified Match</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleVerifyRegistry}
                              disabled={actionLoading}
                              className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-md text-[10px] font-bold cursor-pointer transition-colors shadow-xs"
                            >
                              {actionLoading ? 'Verifying...' : 'Verify land registry now'}
                            </button>
                            <span className="text-red-500 flex items-center gap-1">Unverified / failed</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                        <span className="text-slate-700">2. Buyer Deed Receipt Acknowledged</span>
                        {transaction.buyerConfirmedPropertyReceivedAt ? (
                          <span className="text-emerald-600 flex items-center gap-1">✓ Acknowledged</span>
                        ) : (
                          <span className="text-red-500 flex items-center gap-1">Awaiting buyer</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                        <span className="text-slate-700">3. Seller Mutation Documents Uploaded</span>
                        {transaction.mutationDocuments && transaction.mutationDocuments.length > 0 ? (
                          <span className="text-emerald-600 flex items-center gap-1">✓ {transaction.mutationDocuments.length} Documents</span>
                        ) : (
                          <span className="text-red-500 flex items-center gap-1">No documents</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                        <span className="text-slate-700">4. Ledger Custody Funded</span>
                        {transaction.escrowAccount && parseFloat(transaction.escrowAccount.balance) > 0 ? (
                          <span className="text-emerald-600 flex items-center gap-1">✓ Funded ($USD)</span>
                        ) : (
                          <span className="text-red-500 flex items-center gap-1">Zero balance</span>
                        )}
                      </div>
                    </div>

                    {/* Seller Uploaded Mutation Document Proofs Vault (Explicit Admin Inspection) */}
                    <div className="p-3.5 bg-white rounded-xl border border-purple-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                        <p className="text-xs font-bold text-purple-950 flex items-center gap-1.5 font-sans">
                          Seller mutation document vault
                        </p>
                        <span className="text-[10px] bg-purple-100 text-purple-800 font-extrabold px-2 py-0.5 rounded-full border border-purple-200">
                          {transaction.mutationDocuments?.length || 0} File(s) Uploaded
                        </span>
                      </div>

                      {(!transaction.mutationDocuments || transaction.mutationDocuments.length === 0) ? (
                        <p className="text-xs text-slate-400 italic py-2 text-center">No mutation documents uploaded by seller yet.</p>
                      ) : (
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {transaction.mutationDocuments.map((doc, idx) => (
                            <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3 hover:bg-slate-100/70 transition-colors">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded bg-purple-100 border border-purple-200 text-purple-800 flex items-center justify-center font-bold text-xs shrink-0">
                                  #{idx + 1}
                                </div>
                                <div className="min-w-0 leading-tight">
                                  <p className="text-xs font-bold text-slate-800 truncate">{doc.description || `Mutation Proof File #${idx + 1}`}</p>
                                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : 'Uploaded'}
                                  </p>
                                </div>
                              </div>
                              <a
                                href={resolveImageUrl(doc.documentUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] rounded-md transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1"
                              >
                                <span>Open / inspect document</span>
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Audit Notes Form */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-purple-900 uppercase">Audit Review Notes (Required)</label>
                      <textarea
                        placeholder="Provide detailed admin review audit notes regarding deeds authenticity and ledger balance audits..."
                        className="input-field w-full text-xs !py-1.5 !px-3 h-20 resize-none font-medium"
                        required
                        value={arbitrationNotes}
                        onChange={(e) => setArbitrationNotes(e.target.value)}
                        disabled={actionLoading}
                      />
                    </div>

                    {/* Actions Row */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleAdminRefund}
                        disabled={actionLoading || !arbitrationNotes.trim()}
                        className="btn-secondary text-xs !py-2 bg-red-50 text-red-700 border-red-200 hover:bg-red-100 cursor-pointer"
                      >
                        Reject & Refund Buyer
                      </button>
                      <button
                        type="button"
                        onClick={handleAdminRelease}
                        disabled={actionLoading || !arbitrationNotes.trim()}
                        className="btn-primary text-xs !py-2 !bg-purple-600 hover:!bg-purple-700 cursor-pointer disabled:!bg-purple-200 disabled:!text-purple-400 disabled:!border-purple-200"
                      >
                        Approve & Release Escrow
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

             {/* 4.5 Awaiting Seller Receipt Confirmation */}
            {status === 'AWAITING_RECEIPT' && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl leading-relaxed space-y-3">
                <p className="text-xs font-bold text-purple-800">Funds Released & Awaiting Seller Receipt</p>
                <p className="text-xs text-purple-700 leading-normal font-semibold">
                  The administrator has approved document audits and released the escrow funds. The transaction is pending the final confirmation signature of receipt from the seller to close the contract.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {isSeller && (
                    <button
                      onClick={handleConfirmReceipt}
                      disabled={actionLoading}
                      className="btn-primary text-xs !bg-purple-600 hover:!bg-purple-700 cursor-pointer"
                    >
                      Confirm Receipt of Released Funds
                    </button>
                  )}
                  {transaction.contractDocumentUrl && (
                    <a
                      href={resolveImageUrl(transaction.contractDocumentUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={`EscrowTrust_Contract_${transaction.transactionId || transaction.id}.pdf`}
                      className="btn-secondary text-xs font-bold py-2 px-4 cursor-pointer inline-flex items-center gap-1.5 bg-white text-purple-800 border-purple-300 hover:bg-purple-100"
                    >
                      <span>Download PDF completion contract</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* 5. Completed */}
            {status === 'COMPLETED' && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl leading-relaxed">
                  <p className="text-xs font-bold">Transaction Successfully Settle-Completed</p>
                  <p className="text-xs text-emerald-700 mt-1 leading-normal font-medium">
                    Ownership deeds have been successfully synchronized. Escrow balance was released to the seller, and house status is updated to SOLD.
                  </p>
                </div>

                {/* Printable Deed of Sale Card */}
                <div className="p-6 bg-slate-50 border border-slate-300 rounded-xl space-y-4 shadow-sm border-dashed" id="printable-deed">
                  <div className="text-center space-y-1.5 border-b border-slate-300 pb-4">
                    <h4 className="text-md font-bold text-slate-900 tracking-tight font-serif uppercase">Deed of Sale & Escrow Settlement Certificate</h4>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold font-mono">Platform Reference: {transaction.transactionId}</p>
                  </div>

                  <div className="text-xs text-slate-700 space-y-3 leading-relaxed font-serif">
                    <p>
                      This document certifies that on <strong>{transaction.releaseDate ? new Date(transaction.releaseDate).toLocaleDateString() : new Date().toLocaleDateString()}</strong>, ownership of the property detailed below was legally and permanently transferred from the Seller to the Buyer. The escrow balance has been fully settled.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded-lg border border-slate-200 font-sans text-[11px] leading-tight">
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-1">Buyer Details</p>
                        <p className="font-bold text-slate-800">{transaction.buyer?.name}</p>
                        <p className="text-slate-500 mt-0.5">{transaction.buyer?.email}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-1">Seller Details</p>
                        <p className="font-bold text-slate-800">{transaction.seller?.name}</p>
                        <p className="text-slate-500 mt-0.5">{transaction.seller?.email}</p>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200 font-sans text-[11px] space-y-2">
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100 pb-1">Property & Escrow Specifications</p>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Property Title</span>
                        <strong className="text-slate-800">{transaction.property?.title}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Property Location</span>
                        <strong className="text-slate-800">{transaction.property?.location}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Escrow Address</span>
                        <strong className="text-slate-800 font-mono text-[10px]">{transaction.escrowAccount?.contractAddress}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Settlement Amount</span>
                        <strong className="text-slate-800">${Number(transaction.amount).toLocaleString()} USD</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Left: Cryptographic Proofs */}
                      <div className="p-3 bg-white border border-slate-200 rounded-lg font-sans text-[10px] space-y-2 leading-tight">
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100 pb-1">Cryptographic Proofs</p>
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-500 min-w-[90px]">Buyer signature:</span>
                          <span className="font-mono text-slate-700 break-all">{buyerSignature?.slice(0, 24)}...</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-500 min-w-[90px]">Seller signature:</span>
                          <span className="font-mono text-slate-700 break-all">{sellerSignature?.slice(0, 24)}...</span>
                        </div>
                      </div>

                      {/* Right: Security Verification Portal */}
                      <div className="p-3 bg-white border border-slate-200 rounded-lg font-sans text-[10px] flex items-center gap-3 leading-tight">
                        <div className="shrink-0">
                          <svg width="42" height="42" viewBox="0 0 29 29" className="text-slate-800" fill="currentColor">
                            <path d="M0,0 h7 v7 h-7 z M1,1 v5 h5 v-5 z M2,2 h3 v3 h-3 z" />
                            <path d="M22,0 h7 v7 h-7 z M23,1 v5 h5 v-5 z M24,2 h3 v3 h-3 z" />
                            <path d="M0,22 h7 v7 h-7 z M1,23 v5 h5 v-5 z M2,24 h3 v3 h-3 z" />
                            <path d="M9,1 h2 v2 h-2 z M13,0 h1 v3 h-1 z M16,1 h3 v1 h-3 z M20,2 h1 v1 h-1 z M9,5 h3 v1 h-3 z M14,4 h2 v1 h-2 z M18,5 h2 v2 h-2 z M9,9 h1 v3 h-1 z M12,10 h2 v1 h-2 z M16,9 h1 v1 h-1 z M19,10 h3 v1 h-3 z M24,9 h2 v3 h-2 z M1,9 h2 v2 h-2 z M5,10 h1 v3 h-1 z M10,14 h2 v2 h-2 z M14,13 h3 v1 h-3 z M19,14 h1 v3 h-1 z M23,13 h2 v2 h-2 z M3,15 h2 v2 h-2 z M7,16 h1 v2 h-1 z M11,19 h3 v1 h-3 z M16,18 h2 v2 h-2 z M20,19 h3 v1 h-3 z M25,18 h1 v3 h-1 z M9,22 h2 v2 h-2 z M13,23 h1 v3 h-1 z M17,22 h3 v1 h-3 z M21,24 h1 v1 h-1 z M9,26 h3 v1 h-3 z M14,25 h2 v1 h-2 z M18,26 h2 v2 h-2 z M24,25 h3 v2 h-3 z" />
                          </svg>
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-slate-800 text-[8px] uppercase tracking-wide">Authenticity Verified</p>
                          <p className="text-slate-400 text-[8px] leading-normal font-semibold">Scan QR to verify this deed on the platform registry.</p>
                          <p className="font-mono text-primary-600 text-[7px] font-bold">escrowtrust.com/verify/{transaction.transactionId?.slice(0, 12)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-end pt-4 border-t border-slate-200 text-center font-sans text-[9px] font-bold text-slate-500">
                    <div className="space-y-3">
                      {buyerSignature ? (
                        <div className="text-center font-mono text-[8px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 leading-tight">
                          SIGNED DIGITALLY<br/>{buyerSignature.slice(0, 16)}...
                        </div>
                      ) : (
                        <div className="h-6"></div>
                      )}
                      <p className="border-t border-slate-300 pt-1 px-4">Buyer Signature</p>
                    </div>
                    
                    <div className="space-y-3">
                      {sellerSignature ? (
                        <div className="text-center font-mono text-[8px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 leading-tight">
                          SIGNED DIGITALLY<br/>{sellerSignature.slice(0, 16)}...
                        </div>
                      ) : (
                        <div className="h-6"></div>
                      )}
                      <p className="border-t border-slate-300 pt-1 px-4">Seller Signature</p>
                    </div>

                    <div>
                      <div className="inline-flex flex-col items-center p-2 bg-slate-100 border border-slate-300 rounded text-slate-700 font-mono text-[8px] leading-tight">
                        <span className="font-bold text-[8px] text-slate-800 uppercase tracking-tight">PLATFORM ESCROW SEAL</span>
                        <span className="text-emerald-600 mt-1 font-bold">STATUS: COMPLETED</span>
                        <span className="text-[7px] text-slate-400 mt-0.5">RELEASED BY SYSTEM ADMIN</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-3 mt-4">
                  <button
                    onClick={handlePrintDeed}
                    className="btn-secondary text-xs font-semibold py-1.5 px-4 cursor-pointer"
                  >
                    Print Agreement Receipt
                  </button>
                  {transaction.contractDocumentUrl && (
                    <a
                      href={resolveImageUrl(transaction.contractDocumentUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={`EscrowTrust_Contract_${transaction.transactionId || transaction.id}.pdf`}
                      className="btn-primary text-xs font-semibold py-1.5 px-4 cursor-pointer inline-flex items-center gap-1.5"
                    >
                      ↓ Download PDF Contract
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* 6. Disputed State Card */}
            {status === 'DISPUTED' && (
              <div className="p-5 bg-amber-50 border border-amber-250 rounded-xl leading-relaxed space-y-4 text-left">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
                    <span>Escrow custody locked in dispute</span>
                  </div>
                  <span className="text-[9px] bg-amber-200 text-amber-900 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Arbitration Case Open
                  </span>
                </div>

                {/* Dispute Case Info */}
                {transaction.dispute ? (
                  <div className="space-y-3 text-xs">
                    <div className="bg-white p-3 rounded-lg border border-amber-200 space-y-1.5">
                      <p className="text-amber-800 font-semibold text-[10px] uppercase tracking-wider">Dispute Details</p>
                      <p className="text-slate-800">
                        <strong>Reason:</strong> "{transaction.dispute.reason}"
                      </p>
                      <p className="text-slate-500 text-[10px]">
                        Filed by transacting party on {new Date(transaction.dispute.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {/* Dispute Evidence files list */}
                    <div className="space-y-2">
                      <p className="text-amber-800 font-semibold text-[10px] uppercase tracking-wider">Uploaded Evidence Logs</p>
                      {(!transaction.dispute.evidences || transaction.dispute.evidences.length === 0) ? (
                        <p className="text-slate-400 italic text-[10px]">No evidence documents uploaded yet.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                          {transaction.dispute.evidences.map((ev, evIdx) => (
                            <div key={evIdx} className="bg-white p-2 rounded border border-slate-200 leading-normal flex flex-col gap-0.5 text-[10px]">
                              <p className="font-bold text-slate-800 break-all">{ev.description}</p>
                              <div className="flex justify-between items-center text-slate-400 text-[9px] mt-1 font-semibold">
                                <span className="truncate max-w-[150px] font-mono">{ev.fileUrl}</span>
                                <span>Uploaded by {ev.uploader?.name} ({ev.uploader?.role})</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Evidence Upload Form for active disputes */}
                    {transaction.dispute.status !== 'RESOLVED' && (isBuyer || isSeller) && (
                      <form onSubmit={handleUploadEvidence} className="bg-amber-100/40 p-3 rounded-lg border border-amber-200/60 space-y-2">
                        <p className="text-[10px] font-bold text-amber-900">Submit Evidence Documents</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Evidence URL (e.g. text or file data link)"
                            className="input-field !py-1.5 !px-3 text-[10px]"
                            value={evidenceUrl}
                            onChange={(e) => setEvidenceUrl(e.target.value)}
                            disabled={actionLoading}
                          />
                          <input
                            type="text"
                            placeholder="Evidence description..."
                            className="input-field !py-1.5 !px-3 text-[10px]"
                            value={evidenceDesc}
                            onChange={(e) => setEvidenceDesc(e.target.value)}
                            disabled={actionLoading}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={actionLoading || !evidenceUrl.trim()}
                          className="btn-secondary text-[10px] !py-1 w-full"
                        >
                          Submit Dispute Evidence
                        </button>
                      </form>
                    )}

                    {/* Arbitrator Resolution Console */}
                    {transaction.dispute.status !== 'RESOLVED' && user?.role === 'ADMIN' && (
                      <div className="bg-amber-100/40 p-3 rounded-lg border border-amber-200 space-y-2">
                        <p className="text-[10px] font-bold text-amber-900 uppercase">Mediator Arbitration Verdict</p>
                        
                        {(transaction.dispute.status === 'OPEN' || transaction.dispute.status === 'EVIDENCE_SUBMITTED') && (
                          <button
                            type="button"
                            onClick={handleMediateDispute}
                            disabled={actionLoading}
                            className="btn-primary text-[10px] !py-1.5 w-full bg-purple-650 hover:bg-purple-700 cursor-pointer mb-2"
                          >
                            Mark Case Under Active Mediation (Investigate)
                          </button>
                        )}

                        <textarea
                          placeholder="Provide the formal ruling explanation reason (Required)..."
                          className="input-field w-full text-[10px] !py-1.5 !px-2.5 h-16 resize-none font-medium"
                          required
                          value={arbitrationNotes}
                          onChange={(e) => setArbitrationNotes(e.target.value)}
                          disabled={actionLoading}
                        />
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleResolveDispute('REFUND_TO_BUYER')}
                            disabled={actionLoading}
                            className="btn-secondary text-[10px] !py-1.5 bg-red-50 text-red-700 border-red-200 hover:bg-red-100 cursor-pointer"
                          >
                            Rule in Favor of Buyer (Refund)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolveDispute('RELEASE_TO_SELLER')}
                            disabled={actionLoading}
                            className="btn-primary text-[10px] !py-1.5 !bg-amber-600 hover:!bg-amber-700 cursor-pointer"
                          >
                            Rule in Favor of Seller (Release)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-amber-700 font-medium">
                    A dispute has locked this transaction. Mediators are reviewing logs.
                  </p>
                )}
              </div>
            )}

            {/* File Dispute trigger (Expandable Accordion) */}
            {['FUNDED', 'MUTATION_STARTED', 'UNDER_REVIEW'].includes(status) && (isBuyer || isSeller) && (
              <details className="pt-3 border-t border-slate-100 text-left">
                <summary className="text-[11px] font-bold text-slate-500 hover:text-red-600 cursor-pointer flex items-center gap-1">
                  <span>Having an issue or disagreement? Click here to report a dispute</span>
                </summary>
                <form onSubmit={handleRaiseDispute} className="mt-3 p-3 bg-red-50/50 border border-red-100 rounded-xl space-y-2">
                  <p className="text-[9px] text-slate-500 font-semibold leading-tight">
                    Describing an issue freezes the escrow custody account and opens a formal arbitration case for Admin review.
                  </p>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      required
                      placeholder="Reason for dispute (e.g. Invalid document, non-responsive seller...)"
                      className="input-field text-xs !py-1.5 flex-1"
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      disabled={actionLoading}
                    />
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="btn-secondary text-xs !py-1.5 font-bold text-red-600 border-red-200 hover:bg-red-50 cursor-pointer flex-shrink-0"
                    >
                      File Dispute Case
                    </button>
                  </div>
                </form>
              </details>
            )}

          </div>

          {/* TRANSACTION ACTIVITY TIMELINE */}
          <div className="card p-6 bg-white space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Transaction Activity Feed</h3>
              <span className="text-[10px] bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full font-bold border border-primary-200 uppercase tracking-wider">
                Live Timeline
              </span>
            </div>
            
            {(!transaction.auditLogs || transaction.auditLogs.length === 0) ? (
              <p className="text-xs text-slate-400 italic text-center py-4">No activity recorded yet.</p>
            ) : (
              <div className="relative pl-6 space-y-6 border-l-2 border-slate-100 ml-3">
                {[...transaction.auditLogs].reverse().map((log, index) => {
                  // Determine icon and color based on log action
                  let icon = (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                    </svg>
                  );
                  let iconColor = 'bg-slate-100 text-slate-600 border-slate-200';
                  
                  const actionLower = log.action.toLowerCase();
                  if (actionLower.includes('initiate') || actionLower.includes('agreement')) {
                    icon = (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 009 11V5a2 2 0 00-2-2H4a2 2 0 00-2 2v6a13.978 13.978 0 003.07 8.757" />
                      </svg>
                    );
                    iconColor = 'bg-blue-50 text-blue-600 border-blue-200';
                  } else if (actionLower.includes('consensus') || actionLower.includes('approved state') || actionLower.includes('code')) {
                    icon = (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    );
                    iconColor = 'bg-indigo-50 text-indigo-600 border-indigo-200';
                  } else if (actionLower.includes('deposit') || actionLower.includes('funds deposited') || actionLower.includes('funded')) {
                    icon = (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    );
                    iconColor = 'bg-emerald-50 text-emerald-600 border-emerald-200';
                  } else if (actionLower.includes('upload') || actionLower.includes('document')) {
                    icon = (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    );
                    iconColor = 'bg-amber-50 text-amber-600 border-amber-200';
                  } else if (actionLower.includes('review') || actionLower.includes('admin verification')) {
                    icon = (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    );
                    iconColor = 'bg-purple-50 text-purple-600 border-purple-200';
                  } else if (actionLower.includes('released') || actionLower.includes('completed')) {
                    icon = (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    );
                    iconColor = 'bg-emerald-500 text-white border-emerald-600';
                  } else if (actionLower.includes('refund') || actionLower.includes('cancel')) {
                    icon = (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    );
                    iconColor = 'bg-red-500 text-white border-red-600';
                  }
                  
                  return (
                    <div key={log.id || index} className="relative flex flex-col items-start gap-1">
                      {/* Left Dot Icon */}
                      <span className={`absolute -left-[35px] top-1 flex items-center justify-center w-6 h-6 rounded-full border-2 ${iconColor} z-10 shadow-sm`}>
                        {icon}
                      </span>
                      
                      {/* Event Details */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-2 text-left">
                        <span className="text-xs font-bold text-slate-800 leading-tight">
                          {log.action}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold font-mono md:text-right shrink-0">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      
                      {/* Meta subtext */}
                      <span className="text-[10px] text-slate-550 font-medium text-left">
                        Performed by <span className="font-bold text-slate-700">{log.userName || 'System'}</span> ({log.userRole || 'SYSTEM'})
                        {log.ipAddress && ` • IP: ${log.ipAddress}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* IMMUTABLE TRANSACTION AUDIT TRAIL LOGS */}
          <div className="card p-6 bg-white">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Transaction Immutable Ledger</h3>
            <AuditLog logs={transaction.auditLogs || []} />
          </div>

          {/* FINANCIAL DOUBLE-ENTRY BOOKKEEPING LEDGER */}
          <div className="card p-6 bg-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Financial Bookkeeping Ledger</h3>
              <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold border border-emerald-200">
                Double-Entry Books
              </span>
            </div>

            {(!transaction.ledgerEntries || transaction.ledgerEntries.length === 0) ? (
              <p className="text-xs text-slate-400 italic text-center py-4">No bookkeeping ledger entries recorded yet. Deposit funds to initialize books.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs font-semibold text-slate-700 leading-normal text-left">
                  <thead>
                    <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                      <th className="pb-2">Account Type</th>
                      <th className="pb-2 text-center">Type</th>
                      <th className="pb-2 text-right">Debit ($)</th>
                      <th className="pb-2 text-right">Credit ($)</th>
                      <th className="pb-2 pl-4">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transaction.ledgerEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 font-mono text-slate-800 uppercase tracking-tight">{entry.accountType}</td>
                        <td className="py-2.5 text-center">
                          <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
                            entry.type === 'DEBIT' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-250'
                          }`}>
                            {entry.type}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-bold text-red-650 text-red-600">
                          {entry.type === 'DEBIT' ? `$${Number(entry.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="py-2.5 text-right font-bold text-emerald-650 text-emerald-600">
                          {entry.type === 'CREDIT' ? `$${Number(entry.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="py-2.5 pl-4 text-slate-400 max-w-[200px] truncate" title={entry.description}>{entry.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Right Side: Account and Property specs summaries */}
        <div className="space-y-6">


          
          {/* Escrow Account specifications */}
          <div className="card p-6 bg-white space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Escrow Account Lock</h3>
            
            <div className="space-y-3 text-xs leading-tight">
              <div>
                <p className="text-slate-400 font-semibold mb-0.5">Escrow Contract Reference</p>
                <p className="font-mono font-bold text-slate-800 break-all">{transaction.escrowAccount?.contractAddress}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                  Blockchain ledger (simulated EVM vault)
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-semibold mb-0.5">Escrow Account Number</p>
                <p className="font-mono font-bold text-slate-800">{transaction.escrowAccount?.accountNumber}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <p className="text-slate-400 font-semibold mb-0.5">Locked Balance</p>
                  <p className="text-lg font-extrabold text-slate-900">${Number(transaction.escrowAccount?.balance || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold mb-0.5">Escrow Status</p>
                  <p className="font-bold text-slate-800 mt-0.5 uppercase">{transaction.escrowAccount?.status}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Estimated Net Payout (Seller)</span>
                  <span className="font-bold text-slate-800">${(Number(transaction.amount) - Number(transaction.sellerFee || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Platform Fee Splits</span>
                  <span className="font-bold text-slate-500">${(Number(transaction.buyerFee || 0) + Number(transaction.sellerFee || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-[10px] pl-2 text-slate-400 italic">
                  <span>- Buyer Charge (1%):</span>
                  <span>+${Number(transaction.buyerFee || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-[10px] pl-2 text-slate-400 italic">
                  <span>- Seller Charge (1.5%):</span>
                  <span>-${Number(transaction.sellerFee || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Property Summary specs */}
          <div className="card p-5 bg-white space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Listing Specifications</h3>
            
            <div className="flex gap-3 items-center">
              {transaction.property?.images && transaction.property?.images[0] && (
                <img
                  src={resolveImageUrl(transaction.property.images[0])}
                  alt={transaction.property.title}
                  className="w-14 h-14 rounded-lg object-cover border border-slate-100 flex-shrink-0"
                />
              )}
              <div className="min-w-0">
                <Link to={`/properties/${transaction.propertyId}`} className="text-sm font-bold text-slate-800 truncate block hover:text-primary-600">
                  {transaction.property?.title}
                </Link>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{transaction.property?.location}</p>
              </div>
            </div>

            <div className="section-divider" />

            <div className="space-y-2 text-xs leading-none">
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Asset Price</span>
                <strong className="text-slate-800">${Number(transaction.amount).toLocaleString()} USD</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Category Type</span>
                <strong className="text-slate-800 uppercase">{transaction.property?.propertyType}</strong>
              </div>
            </div>
          </div>

          {/* Mutation upload deeds list */}
          <div className="card p-5 bg-white space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mutation Document Proofs</h3>
            {transaction.mutationDocuments && transaction.mutationDocuments.length > 0 ? (
              <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                {transaction.mutationDocuments.map((doc, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl leading-normal text-xs text-slate-700">
                    <p className="font-bold text-slate-900 break-all">{doc.description}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mt-2">
                      <span className="truncate max-w-[120px] font-mono">{doc.documentUrl}</span>
                      <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-medium italic text-center py-2">No documents uploaded yet.</p>
            )}
          </div>

          </div>
        </div>
      )}

      {/* STAMPED CONTRACT & AI EXPLAINER MODAL */}
      <ContractPreviewModal
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        transaction={transaction}
      />

    </div>
  );
};

export default EscrowDetail;
