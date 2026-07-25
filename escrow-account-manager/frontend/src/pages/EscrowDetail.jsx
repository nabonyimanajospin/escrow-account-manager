import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import AuditLog from '../components/AuditLog';
import toast from 'react-hot-toast';
import { resolveImageUrl } from '../utils/imageUtils';

const EscrowDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [consensusCode, setConsensusCode] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docDesc, setDocDesc] = useState('');
  const [docUploadMode, setDocUploadMode] = useState('link'); // 'link' or 'file'
  const [uploadedDocFile, setUploadedDocFile] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [validationReport, setValidationReport] = useState(null);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceDesc, setEvidenceDesc] = useState('');
  const [arbitrationNotes, setArbitrationNotes] = useState('');

  // AI Document Analysis state
  const [docAnalysisReport, setDocAnalysisReport] = useState(null);
  const [docAnalysisLoading, setDocAnalysisLoading] = useState(false);

  // AI Co-Pilot state
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [aiChatLoading, setAiChatLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    {
      sender: 'ai',
      text: `### 👋 Welcome to your AI Transaction Co-Pilot!
I am here to guide you step-by-step through this escrow transaction.

You can ask me questions like:
- *"What should I do next?"*
- *"How do platform fees work?"*
- *"What is a consensus code?"*`
    }
  ]);

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
    if (transaction && transaction.status === 'PENDING') {
      const calculateTimeLeft = () => {
        const EXPIRATION_LIMIT = 10 * 60 * 1000; // 10 minutes
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
    try {
      setActionLoading(true);
      await axios.post(`/escrow/${id}/deposit`, {
        amount: Number(transaction.amount) + Number(transaction.buyerFee || 0),
        reference: `MOCK-DEP-${Date.now()}`,
      });
      toast.success('Funds successfully locked in escrow');
      fetchTransaction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Deposit simulation failed');
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
    if (!window.confirm('Are you sure you want to cancel this transaction? Any deposited funds will be simulated as refunded.')) return;
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

  // ── AI Document Analysis ──────────────────────────────────────────────────
  const handleAnalyzeDocument = async () => {
    try {
      setDocAnalysisLoading(true);
      toast.loading('🤖 AI is analyzing your document...', { id: 'doc-analysis' });
      const res = await axios.post(`/escrow/${id}/analyze-document`);
      setDocAnalysisReport(res.data.analysis);
      toast.dismiss('doc-analysis');
      const v = res.data.analysis?.verdict;
      if (v === 'LIKELY_VALID') toast.success('✅ Document appears valid');
      else if (v === 'NEEDS_REVIEW') toast.error('⚠️ Document needs admin review');
      else toast.error('🚨 Document flagged as suspicious');
    } catch (err) {
      toast.dismiss('doc-analysis');
      toast.error(err.response?.data?.message || 'AI analysis failed');
    } finally {
      setDocAnalysisLoading(false);
    }
  };



  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setAiMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setAiChatLoading(true);

    try {
      const response = await axios.post(`/escrow/${id}/ai-chat`, { message: userMsg });
      setAiMessages(prev => [...prev, { sender: 'ai', text: response.data.response }]);
    } catch (err) {
      console.error(err);
      toast.error('Failed to get response from AI Co-Pilot');
      setAiMessages(prev => [...prev, { sender: 'ai', text: '⚠️ Failed to connect to AI Co-Pilot service. Please verify your connection.' }]);
    } finally {
      setAiChatLoading(false);
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
      <div className="min-h-[85vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-10 w-10 text-primary-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-semibold text-slate-500">Decrypting transaction records...</span>
        </div>
      </div>
    );
  }

  const { status, buyerAuthorized, sellerAuthorized } = transaction;

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

      {/* 1. STATE MACHINE TIMELINE */}
      <div className="card p-6 bg-white border border-slate-200">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Escrow Transaction Progress</h2>
        
        {status === 'REFUNDED' ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
            <p className="text-sm font-bold text-red-800">Transaction Voided</p>
            <p className="text-xs text-red-600 mt-1">This transaction agreement has been cancelled, and any deposited capital has been refunded.</p>
          </div>
        ) : status === 'DISPUTED' ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <p className="text-sm font-bold text-amber-800">⚠️ Active Dispute Filed</p>
            <p className="text-xs text-amber-600 mt-1">This transaction is currently frozen under active dispute mediation. No funds will be released until the arbitrator resolves this case.</p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
            
            {/* Timeline line background */}
            <div className="hidden md:block absolute left-4 right-4 top-1/2 -translate-y-1/2 h-[3px] bg-slate-100 -z-10" />

            {[
              { label: 'Agreement Pending', key: 'PENDING', desc: 'Sign online contract' },
              { label: 'Escrow Funded', key: 'FUNDED', desc: 'Buyer deposits capital' },
              { label: 'Mutation Initiated', key: 'MUTATION_STARTED', desc: 'Seller starts ownership transfer' },
              { label: 'Under Review', key: 'UNDER_REVIEW', desc: 'Admin audits documents' },
              { label: 'Awaiting Receipt', key: 'AWAITING_RECEIPT', desc: 'Seller confirms payout' },
              { label: 'Settled / Sold', key: 'COMPLETED', desc: 'Transaction finalized' },
            ].map((step, idx) => {
              const isPast = currentStep > idx;
              const isCurrent = currentStep === idx;
              return (
                <div key={step.key} className="flex-1 flex md:flex-col items-center gap-4 md:gap-3 text-left md:text-center">
                  
                  {/* Circle Pin */}
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                    isPast
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : isCurrent
                      ? 'border-primary-600 bg-primary-600 text-white shadow'
                      : 'border-slate-200 bg-white text-slate-400'
                  }`}>
                    {idx + 1}
                  </div>

                  {/* Descriptions */}
                  <div className="leading-tight">
                    <p className={`text-sm font-bold ${isCurrent ? 'text-primary-700' : 'text-slate-800'}`}>{step.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed font-semibold">{step.desc}</p>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. TRANSACTION AND ACCOUNT DETAILS SPLIT */}
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
              <span className="text-[10px] font-mono bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded font-bold">
                Online Contract Version 1.0
              </span>
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

            {/* Consensus Signing Input Console */}
            {!userHasSigned && ['PENDING', 'FUNDED', 'MUTATION_STARTED'].includes(status) && (isBuyer || isSeller) && (
              <form onSubmit={handleVerifyCode} className="mt-5 p-4 bg-primary-50/50 border border-primary-200 rounded-xl flex flex-col md:flex-row items-center gap-4">
                <div className="flex-grow text-left">
                  <p className="text-xs font-bold text-primary-900">Cryptographical Contract Consensus</p>
                  <p className="text-[10px] text-primary-700 font-semibold leading-tight mt-0.5">
                    Verify the One-Time Consensus Code sent to your secure notification delivery channel to sign terms.
                  </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto items-center">
                  <input
                    type="text"
                    required
                    maxLength={4}
                    className="input-field !py-1.5 !px-3 font-mono text-center font-bold text-sm !w-24 placeholder:font-sans"
                    placeholder="Code"
                    value={consensusCode}
                    onChange={(e) => setConsensusCode(e.target.value.replace(/[^0-9]/g, ''))}
                    disabled={actionLoading}
                  />
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="btn-primary text-xs !py-1.5 whitespace-nowrap"
                  >
                    Sign Contract
                  </button>
                </div>
              </form>
            )}

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
                  Both parties have signed contract consensus. The Buyer must now deposit property value into escrow account before the lock expires.
                </p>
                {isBuyer ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleDeposit}
                      disabled={actionLoading || !buyerAuthorized || !sellerAuthorized}
                      className="btn-primary text-xs"
                    >
                      {actionLoading ? 'Locking Funds...' : 'Simulate Deposit ($' + Number(Number(transaction.amount) + Number(transaction.buyerFee || 0)).toLocaleString() + ')'}
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
                {(!buyerAuthorized || !sellerAuthorized) && (
                  <p className="text-[10px] text-slate-400 font-bold leading-tight">
                    * Button locks until both Buyer and Seller submit matching cryptographic consensus signatures.
                  </p>
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
                      disabled={actionLoading || !buyerAuthorized || !sellerAuthorized}
                      className="btn-primary text-xs"
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
                {(!buyerAuthorized || !sellerAuthorized) && (
                  <p className="text-[10px] text-slate-400 font-bold leading-tight">
                    * Action locks until both parties sign verification code {transaction.verificationCode} for mutation start consensus.
                  </p>
                )}
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
                          placeholder="Document URL / Link"
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
                      disabled={actionLoading || !buyerAuthorized || !sellerAuthorized || transaction.mutationDocuments.length === 0}
                      className="btn-primary text-xs"
                    >
                      Submit for Admin Review
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-slate-400 italic">Waiting for Seller to submit transfer deeds...</span>
                  )}
                </div>

                {transaction.mutationDocuments.length === 0 && isSeller && (
                  <p className="text-[10px] text-red-500 font-bold leading-tight">* Upload at least one document proof first.</p>
                )}

                {(!buyerAuthorized || !sellerAuthorized) && (
                  <p className="text-[10px] text-slate-400 font-bold leading-tight">
                    * Submission locks until both parties sign consensus code for mutation complete consensus. Check notification vault.
                  </p>
                )}

                {transaction.mutationDocuments.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5 items-start text-left">
                    <p className="text-[10px] text-primary-600 font-bold">💡 Bypass Consensus Signature: Automated Registry Verification</p>
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
                          📋 Copy Deed Text Template
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
                            ⚠ Document verification rejected. Please generate and upload a document matching the template.
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

            {/* ── AI Document Authenticity Analysis ─────────────────────── */}
            {isSeller && status === 'MUTATION_STARTED' && transaction.mutationDocuments?.length > 0 && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-purple-900">🤖 AI Document Authenticity Check</p>
                    <p className="text-[10px] text-purple-600 font-semibold mt-0.5">
                      AI scans your uploaded document for UPI code, owner name, and fraud signals.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAnalyzeDocument}
                    disabled={docAnalysisLoading}
                    className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
                  >
                    {docAnalysisLoading ? '🔍 Analyzing...' : '🤖 Run AI Analysis'}
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
                        {docAnalysisReport.verdict === 'LIKELY_VALID' && '✅ Document appears valid'}
                        {docAnalysisReport.verdict === 'NEEDS_REVIEW' && '⚠️ Admin review required'}
                        {docAnalysisReport.verdict === 'SUSPICIOUS' && '🚨 Document is suspicious'}
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
                        <p className="text-[10px] font-bold text-red-500 mb-1">⚠️ Flags:</p>
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
                  📁 Buyer Mutation Deed Receipt Signature
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
                        <span>⚖️ Administrative Audit Control Console</span>
                      </div>
                      <span className="text-[9px] bg-purple-200 text-purple-900 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Checklist Audit
                      </span>
                    </div>

                    {/* Checklist Requirements Indicators */}
                    <div className="space-y-2 text-xs font-semibold">
                      <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                        <span className="text-slate-700">1. Government Land Registry Verified</span>
                        {validationReport && validationReport.registryRecordFound === 'VERIFIED' && validationReport.upiFormatMatch === 'VERIFIED' ? (
                          <span className="text-emerald-600 flex items-center gap-1">✓ Verified Match</span>
                        ) : (
                          <span className="text-red-500 flex items-center gap-1">⚠ Unverified / Failed</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                        <span className="text-slate-700">2. Buyer Deed Receipt Acknowledged</span>
                        {transaction.buyerConfirmedPropertyReceivedAt ? (
                          <span className="text-emerald-600 flex items-center gap-1">✓ Acknowledged</span>
                        ) : (
                          <span className="text-red-500 flex items-center gap-1">⚠ Awaiting Buyer</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                        <span className="text-slate-700">3. Seller Mutation Documents Uploaded</span>
                        {transaction.mutationDocuments && transaction.mutationDocuments.length > 0 ? (
                          <span className="text-emerald-600 flex items-center gap-1">✓ {transaction.mutationDocuments.length} Documents</span>
                        ) : (
                          <span className="text-red-500 flex items-center gap-1">⚠ No Documents</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                        <span className="text-slate-700">4. Ledger Custody Funded</span>
                        {transaction.escrowAccount && parseFloat(transaction.escrowAccount.balance) > 0 ? (
                          <span className="text-emerald-600 flex items-center gap-1">✓ Funded ($USD)</span>
                        ) : (
                          <span className="text-red-500 flex items-center gap-1">⚠ Zero Balance</span>
                        )}
                      </div>
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
                        disabled={
                          actionLoading ||
                          !arbitrationNotes.trim() ||
                          !(validationReport && validationReport.registryRecordFound === 'VERIFIED' && validationReport.upiFormatMatch === 'VERIFIED') ||
                          !transaction.buyerConfirmedPropertyReceivedAt ||
                          !(transaction.mutationDocuments && transaction.mutationDocuments.length > 0) ||
                          !(transaction.escrowAccount && parseFloat(transaction.escrowAccount.balance) > 0)
                        }
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
                <p className="text-xs font-bold text-purple-850 text-purple-800">Funds Released & Awaiting Seller Receipt</p>
                <p className="text-xs text-purple-700 leading-normal font-semibold">
                  The administrator has approved document audits and released the escrow funds. The transaction is pending the final confirmation signature of receipt from the seller to close the contract.
                </p>
                {isSeller ? (
                  <button
                    onClick={handleConfirmReceipt}
                    disabled={actionLoading}
                    className="btn-primary text-xs !bg-purple-600 hover:!bg-purple-700 cursor-pointer"
                  >
                    Confirm Receipt of Released Funds
                  </button>
                ) : (
                  <p className="text-[10px] text-slate-400 font-bold italic">Waiting for Seller to acknowledge receipt of money...</p>
                )}
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
                      href={transaction.contractDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
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
                    <span>⚠️ Escrow Custody Locked in Dispute</span>
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

            {/* Unified File Dispute trigger for active states */}
            {['FUNDED', 'MUTATION_STARTED', 'UNDER_REVIEW'].includes(status) && (isBuyer || isSeller) && (
              <form onSubmit={handleRaiseDispute} className="pt-4 border-t border-slate-100 space-y-3 text-left">
                <div>
                  <p className="text-[11px] font-bold text-slate-700">Having issues with this transaction?</p>
                  <p className="text-[9px] text-slate-400 font-semibold leading-tight mt-0.5">
                    Describe the issue or disagreement below to freeze the escrow custody account and file a formal dispute case.
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    required
                    placeholder="Enter reason for dispute..."
                    className="input-field flex-grow !py-1.5 !px-3 text-xs"
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    disabled={actionLoading}
                  />
                  <button
                    type="submit"
                    disabled={actionLoading || !disputeReason.trim()}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    File Dispute
                  </button>
                </div>
              </form>
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
                <p className="text-slate-400 font-semibold mb-0.5">Mock Contract Address</p>
                <p className="font-mono font-bold text-slate-800 break-all">{transaction.escrowAccount?.contractAddress}</p>
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

      {/* Floating AI Chat Assistant Trigger Button */}
      <button
        onClick={() => setIsAIChatOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary-700 hover:scale-105 active:scale-95 transition-all z-40 cursor-pointer"
        title="Chat with AI Co-Pilot"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {/* AI Co-Pilot Sidebar Drawer */}
      {isAIChatOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-end z-50 animate-fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600">
                  <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 leading-tight">AI Escrow Co-Pilot</h4>
                  <p className="text-[10px] text-emerald-600 font-bold leading-none mt-0.5">Context: Active Transaction Guidance</p>
                </div>
              </div>
              <button
                onClick={() => setIsAIChatOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-slate-50/50">
              {aiMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-2xl max-w-[85%] text-xs font-semibold leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-primary-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 rounded-tl-none border border-slate-200'
                  }`}>
                    {/* Render basic markdown/line breaks */}
                    {msg.text.split('\n').map((line, lIdx) => {
                      if (line.startsWith('### ')) {
                        return <h5 key={lIdx} className="font-bold text-sm mt-2 mb-1 first:mt-0">{line.replace('### ', '')}</h5>;
                      }
                      if (line.startsWith('- ')) {
                        return <li key={lIdx} className="ml-3 list-disc mt-0.5">{line.replace('- ', '')}</li>;
                      }
                      return <p key={lIdx} className="mt-1 first:mt-0">{line}</p>;
                    })}
                  </div>
                </div>
              ))}
              {aiChatLoading && (
                <div className="flex justify-start">
                  <div className="p-3 bg-white border border-slate-200 rounded-2xl rounded-tl-none flex items-center gap-2 shadow-sm text-xs font-semibold text-slate-400 animate-pulse">
                    <svg className="animate-spin h-4 w-4 text-primary-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>AI Co-Pilot is thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex gap-2">
              <input
                type="text"
                className="input-field flex-grow !py-1.5 !px-3 text-xs"
                placeholder="Ask Co-Pilot about this deal..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={aiChatLoading}
              />
              <button
                type="submit"
                disabled={aiChatLoading || !chatInput.trim()}
                className="btn-primary !py-1.5 !px-3 text-xs flex items-center justify-center cursor-pointer"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default EscrowDetail;
