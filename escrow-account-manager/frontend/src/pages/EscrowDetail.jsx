import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import AuditLog from '../components/AuditLog';
import toast from 'react-hot-toast';

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
  const [uploadedDocBase64, setUploadedDocBase64] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);

  const handleDocFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) { // 3MB limit
        toast.error('File is too large. Please select a document under 3MB.');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedDocBase64(reader.result);
      };
      reader.readAsDataURL(file);
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
        amount: Number(transaction.amount),
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
    const finalDocUrl = docUploadMode === 'file' ? uploadedDocBase64 : docUrl;
    if (!finalDocUrl || !docDesc) {
      toast.error('Please fill in both fields / select a file');
      return;
    }
    try {
      setActionLoading(true);
      await axios.post(`/escrow/${id}/upload-document`, {
        documentUrl: finalDocUrl,
        description: docDesc,
      });
      toast.success('Mutation document uploaded');
      setDocUrl('');
      setUploadedDocBase64('');
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

  const handlePrintDeed = () => {
    const printContent = document.getElementById('printable-deed').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
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
          </style>
        </head>
        <body>
          <div style="max-width: 700px; margin: 0 auto; border: 4px double #1a202c; padding: 30px; border-radius: 8px;">
            ${printContent}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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

  const { status, buyerAuthorized, sellerAuthorized, verificationCode } = transaction;

  // Determine current active lifecycle step index
  const states = ['PENDING', 'FUNDED', 'MUTATION_STARTED', 'UNDER_REVIEW', 'COMPLETED'];
  let currentStep = states.indexOf(status);
  if (status === 'REFUNDED') currentStep = -1; // special cancel case

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

  // Calculate mock contract signatures based on authorization state
  const buyerSignature = buyerAuthorized 
    ? 'SIG-BUYER-' + getMockHash(`${transaction.buyerId}-${transaction.id}-${verificationCode}`)
    : null;
  const sellerSignature = sellerAuthorized
    ? 'SIG-SELLER-' + getMockHash(`${transaction.sellerId}-${transaction.id}-${verificationCode}`)
    : null;

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
        ) : (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
            
            {/* Timeline line background */}
            <div className="hidden md:block absolute left-4 right-4 top-1/2 -translate-y-1/2 h-[3px] bg-slate-100 -z-10" />

            {[
              { label: 'Agreement Pending', key: 'PENDING', desc: 'Sign online contract' },
              { label: 'Escrow Funded', key: 'FUNDED', desc: 'Buyer deposits capital' },
              { label: 'Mutation Initiated', key: 'MUTATION_STARTED', desc: 'Seller starts ownership transfer' },
              { label: 'Under Review', key: 'UNDER_REVIEW', desc: 'Admin audits documents' },
              { label: 'Settled / Sold', key: 'COMPLETED', desc: 'Escrow released to seller' },
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
                    Verify Consensus Code <strong className="text-primary-900 font-extrabold">{verificationCode}</strong> to sign agreement terms and authorize next transition step.
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
                You have signed. Awaiting counterparty cryptographic signature for code {verificationCode}...
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
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDeposit}
                    disabled={actionLoading || !buyerAuthorized || !sellerAuthorized}
                    className="btn-primary text-xs"
                  >
                    {actionLoading ? 'Locking Funds...' : 'Simulate Deposit ($' + Number(transaction.amount).toLocaleString() + ')'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="btn-secondary text-xs hover:text-red-600 hover:border-red-200"
                  >
                    Cancel Agreement
                  </button>
                </div>
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
                  Escrow holds locked deposit of <strong>${Number(transaction.amount).toLocaleString()} USD</strong>. The Seller must initiate ownership mutation.
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
                    * Action locks until both parties sign verification code {verificationCode} for mutation start consensus.
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
                          {uploadedDocBase64 && (
                            <span className="text-[10px] text-emerald-600 font-bold block mt-1">✓ Document loaded from PC</span>
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
                    * Submission locks until both parties sign verification code {verificationCode} for mutation complete consensus.
                  </p>
                )}
              </div>
            )}

            {/* 4. Under Review (Awaiting Admin) */}
            {status === 'UNDER_REVIEW' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed">
                <p className="text-xs font-bold text-slate-800">Awaiting Administrative Audit</p>
                <p className="text-xs text-slate-500 mt-1 leading-normal font-semibold">
                  All mutation documents have been locked and submitted. The platform administrator is verifying deeds. Escrow payout release or refund triggers shortly.
                </p>
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

                    <div className="p-3 bg-white border border-slate-200 rounded-lg font-sans text-[10px] space-y-1.5 leading-none">
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100 pb-1">Cryptographic Proofs</p>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Buyer signature hash:</span>
                        <span className="font-mono text-slate-700">{buyerSignature?.slice(0, 32)}...</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Seller signature hash:</span>
                        <span className="font-mono text-slate-700">{sellerSignature?.slice(0, 32)}...</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-slate-200 text-center font-sans text-[9px] font-bold text-slate-500">
                    <div>
                      <p className="border-t border-slate-300 pt-1 px-4">Buyer Signature</p>
                    </div>
                    <div>
                      <p className="border-t border-slate-300 pt-1 px-4">Seller Signature</p>
                    </div>
                    <div>
                      <p className="border-t border-slate-300 pt-1 px-4">Escrow Admin Seal</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={handlePrintDeed}
                    className="btn-secondary text-xs font-semibold py-1.5 px-4 cursor-pointer"
                  >
                    Print Agreement Receipt
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* IMMUTABLE TRANSACTION AUDIT TRAIL LOGS */}
          <div className="card p-6 bg-white">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Transaction Immutable Ledger</h3>
            <AuditLog logs={transaction.auditLogs || []} />
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
            </div>
          </div>

          {/* Property Summary specs */}
          <div className="card p-5 bg-white space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Listing Specifications</h3>
            
            <div className="flex gap-3 items-center">
              {transaction.property?.images && transaction.property?.images[0] && (
                <img
                  src={transaction.property.images[0]}
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

    </div>
  );
};

export default EscrowDetail;
