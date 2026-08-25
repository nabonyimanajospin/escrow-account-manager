import React, { useState, useRef, useCallback } from 'react';
import axios from '../../api/axiosConfig';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../../context/AuthContext';
import { getStableContractChecksum, isContractFinalized } from '../../utils/contractChecksum';
import BrandLogo from '../BrandLogo';

const WORKFLOW_BY_STATUS = {
  PENDING: 'Awaiting dual OTP consensus from buyer and seller',
  FUNDED: 'Buyer deposit received — seller should upload mutation documents',
  MUTATION_STARTED: 'Seller uploading title mutation / deed proof',
  UNDER_REVIEW: 'Admin reviewing documents and registry verification',
  DISPUTED: 'Deal frozen — dispute mediation in progress',
  AWAITING_RECEIPT: 'Funds released — buyer should confirm property receipt',
  COMPLETED: 'Deal successfully completed',
  REFUNDED: 'Buyer refunded — deal closed',
  CANCELLED: 'Deal cancelled',
};

const getSelectionContext = (selection, containerRef) => {
  if (!selection || selection.isCollapsed) {
    return { selectedText: '', paragraphText: '', clauseLabel: '', rect: null };
  }

  const selectedText = selection.toString().trim();
  if (selectedText.length < 2) {
    return { selectedText: '', paragraphText: '', clauseLabel: '', rect: null };
  }

  const anchorEl = selection.anchorNode?.nodeType === Node.TEXT_NODE
    ? selection.anchorNode.parentElement
    : selection.anchorNode;

  if (!containerRef.current?.contains(anchorEl)) {
    return { selectedText: '', paragraphText: '', clauseLabel: '', rect: null };
  }

  const paragraphEl = anchorEl?.closest?.('[data-contract-clause]');
  const paragraphText = paragraphEl?.innerText?.trim() || selectedText;
  const clauseLabel = paragraphEl?.getAttribute('data-clause-label') || '';

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  return { selectedText, paragraphText, clauseLabel, rect };
};

const sanitizeExplanationMarkdown = (text = '') => {
  let out = String(text).trim();
  const boldCount = (out.match(/\*\*/g) || []).length;
  if (boldCount % 2 !== 0) out += '**';
  return out;
};

const ContractPreviewModal = ({ isOpen, onClose, transaction, onOpenPdfModal }) => {
  const { user } = useAuth();
  const [selectedText, setSelectedText] = useState('');
  const [paragraphText, setParagraphText] = useState('');
  const [clauseLabel, setClauseLabel] = useState('');
  const [floatingPos, setFloatingPos] = useState({ top: 0, left: 0, visible: false });
  const [aiExplanation, setAiExplanation] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const contractRef = useRef(null);

  const handleMouseUp = useCallback(() => {
    if (!transaction) return;
    const selection = window.getSelection();
    const ctx = getSelectionContext(selection, contractRef);

    if (!ctx.selectedText || !ctx.rect) {
      setFloatingPos((prev) => ({ ...prev, visible: false }));
      return;
    }

    const { width, height } = ctx.rect;
    if (width === 0 && height === 0) {
      setFloatingPos((prev) => ({ ...prev, visible: false }));
      return;
    }

    const btnWidth = 88;
    const left = Math.min(
      window.innerWidth - btnWidth - 12,
      Math.max(12, ctx.rect.left + ctx.rect.width / 2 - btnWidth / 2)
    );
    const top = ctx.rect.bottom + 6;

    setSelectedText(ctx.selectedText);
    setParagraphText(ctx.paragraphText);
    setClauseLabel(ctx.clauseLabel);
    setFloatingPos({ top, left, visible: true });
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const { property, buyer, seller, amount, buyerFee, sellerFee, status, id, createdAt, transactionId, buyerAuthorized, sellerAuthorized } = transaction;
  const priceNum = parseFloat(amount || 0);
  const buyerFeeNum = parseFloat(buyerFee || (priceNum * 0.01));

  const sellerFeeNum = parseFloat(sellerFee || (priceNum * 0.015));
  const totalBuyerPaid = priceNum + buyerFeeNum;
  const sellerNetPayout = priceNum - sellerFeeNum;

  const checksum = getStableContractChecksum(transaction);
  const verificationUrl = `${window.location.origin}/verify-contract/${encodeURIComponent(checksum)}`;
  const isFinalized = isContractFinalized(status);

  const buildAiContext = () => ({
    selectedText,
    paragraphText,
    clauseLabel,
    userRole: user?.role || 'Participant',
    userName: user?.name,
    propertyTitle: property?.title,
    propertyLocation: property?.location,
    upiCode: property?.upiCode,
    amount: priceNum,
    buyerFee: buyerFeeNum,
    sellerFee: sellerFeeNum,
    totalBuyerPaid,
    sellerNetPayout,
    status,
    buyerName: buyer?.name,
    sellerName: seller?.name,
    transactionId: transactionId || `TXN-${id}`,
    buyerAuthorized: !!buyerAuthorized,
    sellerAuthorized: !!sellerAuthorized,
    currentWorkflowStep: WORKFLOW_BY_STATUS[status] || status,
    mutationDocCount: transaction.mutationDocuments?.length || 0,
    escrowBalance: parseFloat(transaction.escrowAccount?.balance || 0),
    contractCreatedDate: createdAt,
  });

  const handleAskAI = async () => {
    if (!selectedText) return;
    setFloatingPos((prev) => ({ ...prev, visible: false }));
    window.getSelection()?.removeAllRanges?.();

    setAiExplanation({
      selectedText,
      paragraphText,
      clauseLabel,
      explanation: '',
      userRole: user?.role,
    });
    setLoadingAi(true);

    try {
      const res = await axios.post('/escrow/contract/explain', {
        text: selectedText,
        context: buildAiContext(),
      });

      if (res.data.success) {
        const explanation = (res.data.explanation || '').trim();
        setAiExplanation({
          selectedText,
          paragraphText: res.data.paragraphText || paragraphText,
          clauseLabel,
          explanation: explanation || 'Explanation could not be generated. Please try selecting a smaller phrase or resubmit.',
          userRole: user?.role,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('AI could not interpret the selected text right now.');
      setAiExplanation(null);
    } finally {
      setLoadingAi(false);
    }
  };

  const generateQrSvg = () => (
    <div className="bg-white p-1.5 rounded-lg border border-slate-300 shadow-2xs">
      <QRCodeSVG value={verificationUrl} size={92} level="H" />
    </div>
  );

  const generateBarcodeSvg = () => (
    <div className="flex flex-col items-center">
      <svg className="h-10 w-48 text-slate-900" viewBox="0 0 200 40">
        <rect width="200" height="40" fill="#ffffff" />
        <path d="M5 0 v40 M10 0 v40 M18 0 v40 M22 0 v40 M28 0 v40 M38 0 v40 M42 0 v40 M48 0 v40 M55 0 v40 M62 0 v40 M70 0 v40 M78 0 v40 M85 0 v40 M92 0 v40 M100 0 v40 M110 0 v40 M118 0 v40 M126 0 v40 M134 0 v40 M142 0 v40 M150 0 v40 M160 0 v40 M170 0 v40 M180 0 v40 M190 0 v40" stroke="currentColor" strokeWidth="2.5" />
      </svg>
      <span className="text-[10px] font-mono font-bold text-slate-600 mt-1 uppercase tracking-widest">
        REF: TX-{id}-RW-DEED
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">

      {/* "Ask AI" — appears directly beside the highlighted passage */}
      {floatingPos.visible && (
        <button
          type="button"
          style={{ top: `${floatingPos.top}px`, left: `${floatingPos.left}px`, position: 'fixed' }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleAskAI}
          className="z-[100] bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-3 py-1.5 rounded-lg shadow-lg border border-indigo-400 flex items-center gap-1 transition-transform hover:scale-105"
          aria-label="Ask AI to explain this paragraph"
        >
          <span aria-hidden="true">✨</span>
          <span>Ask AI</span>
        </button>
      )}

      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">

        <div className="bg-slate-900 text-white p-4 sm:p-6 flex justify-between items-center border-b border-slate-800">
          <div>
            <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-mono uppercase font-bold tracking-wider">
              {isFinalized ? 'Legal Contract Preview' : 'Draft Contract Preview'}
            </span>
            <h2 className="text-xl sm:text-2xl font-black mt-1">Official Property Escrow Agreement</h2>
            <p className="text-[11px] text-slate-400 mt-1">
              Reading as <strong className="text-amber-300">{user?.role || 'Guest'}</strong>
              {user?.name ? ` — ${user.name}` : ''}. Select any sentence to get a full paragraph explanation.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-lg transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <span className="text-base">💡</span>
            <span>
              <strong>Tip:</strong> Highlight any word, sentence, or whole clause — <strong>Ask AI</strong> explains what it means, how it works, and what you should know for your role.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenPdfModal) onOpenPdfModal();
            }}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition flex items-center gap-1 cursor-pointer print:hidden"
          >
            <span>🔒 Download Protected PDF (+ Password & QR)</span>
          </button>
        </div>


        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-grow" onMouseUp={handleMouseUp} ref={contractRef}>

          {(loadingAi || aiExplanation) && (
            <div className="bg-indigo-950 text-white p-5 rounded-2xl border border-indigo-700 shadow-lg space-y-3 animate-fadeIn">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider">
                  <span>🧠 AI Co-Pilot — {aiExplanation?.userRole || user?.role || 'Your'} View</span>
                </div>
                <button onClick={() => setAiExplanation(null)} className="text-indigo-300 hover:text-white text-xs font-bold">
                  Close ×
                </button>
              </div>

              {loadingAi ? (
                <div className="flex items-center gap-3 text-sm text-indigo-200 py-2">
                  <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span>Explaining your selected words in context of this deal...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-[11px] text-indigo-300 space-y-1 border-b border-indigo-800 pb-2 mb-2">
                    {aiExplanation.clauseLabel && (
                      <p className="font-bold text-amber-300">{aiExplanation.clauseLabel}</p>
                    )}
                    <p>
                      <span className="text-indigo-400 font-semibold">You selected:</span>{' '}
                      &ldquo;{aiExplanation.selectedText.length > 180
                        ? `${aiExplanation.selectedText.slice(0, 180)}…`
                        : aiExplanation.selectedText}&rdquo;
                    </p>
                  </div>
                  <div className="text-xs sm:text-sm text-slate-100 leading-relaxed font-sans bg-indigo-900/60 p-3.5 rounded-xl border border-indigo-800 prose prose-invert prose-sm max-w-none prose-p:my-2 prose-strong:text-amber-200 prose-li:my-1 prose-headings:text-amber-300 break-words overflow-visible">
                    <ReactMarkdown>{sanitizeExplanationMarkdown(aiExplanation.explanation)}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className={`border-4 p-6 rounded-xl bg-slate-50 relative overflow-hidden ${isFinalized ? 'border-slate-900 contract-printable' : 'border-amber-600 contract-preview-draft'}`}>

            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 pointer-events-none transform rotate-12 opacity-90">
              <div className={`w-36 h-36 rounded-full border-[5px] flex flex-col items-center justify-center text-center p-2 shadow-xl ring-4 ${
                isFinalized
                  ? 'border-emerald-700 bg-emerald-50 ring-emerald-500/30'
                  : 'border-amber-600 bg-amber-500/10 ring-amber-500/20'
              }`}>
                <span className={`text-[8px] font-black uppercase tracking-widest ${isFinalized ? 'text-emerald-800' : 'text-amber-800'}`}>
                  REPUBLIC OF RWANDA
                </span>
                <span className={`text-[10px] font-extrabold my-0.5 ${isFinalized ? 'text-emerald-900' : 'text-amber-900'}`}>
                  {isFinalized ? 'ESCROWTRUST' : 'LAND VAULT'}
                </span>
                <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                  isFinalized ? 'text-emerald-800 bg-emerald-200' : 'text-amber-800 bg-amber-200/80'
                }`}>
                  {isFinalized ? 'OFFICIAL ESCROW STAMP' : 'DRAFT — IN PROGRESS'}
                </span>
                {isFinalized && (
                  <span className="text-[7px] font-bold text-emerald-700 mt-1 uppercase tracking-wide">
                    Completed & Verified
                  </span>
                )}
              </div>
            </div>

            <div className="text-center border-b border-slate-300 pb-4 mb-6">
              <div className="flex justify-center mb-3">
                <BrandLogo variant="primary" imgClassName="h-10 sm:h-12 w-auto" alt="EscrowTrust" />
              </div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                REPUBLIC OF RWANDA • LAND MANAGEMENT & ESCROW VAULT
              </h3>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 uppercase tracking-tight">
                REAL ESTATE PURCHASE ESCROW CONTRACT
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-1">
                Deed UPI: <strong className="text-slate-800 font-bold">{property?.upiCode || '1/03/01/04/3000'}</strong> • Escrow Transaction ID: #{id}
              </p>
            </div>

                        <div className="space-y-4 text-slate-800 select-text font-sans">
              <section
                data-contract-clause
                data-clause-label="Article 1 — Parties & Subject Matter"
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"
              >
                <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest">Article 1 — Parties & Subject Matter</p>
                  <span className="text-[9px] font-bold text-slate-300">Who & what is sold</span>
                </div>
                <div className="p-4 space-y-3 text-xs sm:text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Buyer</p>
                      <p className="font-extrabold text-slate-900">{buyer?.name || 'Buyer'}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{buyer?.email || '—'}</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Seller</p>
                      <p className="font-extrabold text-slate-900">{seller?.name || 'Seller'}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{seller?.email || '—'}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-3 space-y-2">
                    <div className="flex justify-between gap-3 border-b border-slate-50 pb-2">
                      <span className="text-slate-500 font-semibold">Effective date</span>
                      <strong className="text-slate-900 text-right">
                        {new Date(createdAt || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </strong>
                    </div>
                    <div className="flex justify-between gap-3 border-b border-slate-50 pb-2">
                      <span className="text-slate-500 font-semibold">Property</span>
                      <strong className="text-slate-900 text-right">{property?.title || '—'}</strong>
                    </div>
                    <div className="flex justify-between gap-3 border-b border-slate-50 pb-2">
                      <span className="text-slate-500 font-semibold">Location</span>
                      <strong className="text-slate-900 text-right">{property?.location || '—'}</strong>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500 font-semibold">Purchase price</span>
                      <strong className="text-emerald-700 font-mono">${priceNum.toLocaleString()} USD</strong>
                    </div>
                  </div>
                  <ul className="text-[11px] text-slate-700 leading-relaxed space-y-1.5 list-disc pl-4">
                    <li>Seller warrants lawful ownership and authority to sell the Property free of undisclosed encumbrances known to Seller.</li>
                    <li>Buyer agrees to purchase the Property at the stated price under the escrow terms of this Agreement.</li>
                    <li>Title shall pass only through the escrow and mutation process administered on EscrowTrust.</li>
                  </ul>
                </div>
              </section>

              <section
                data-contract-clause
                data-clause-label="Article 2 — Price, Fees & Escrow Custody"
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"
              >
                <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest">Article 2 — Price, Fees & Escrow Custody</p>
                  <span className="text-[9px] font-bold text-slate-300">Commercial terms</span>
                </div>
                <div className="p-4 space-y-3 text-xs sm:text-sm">
                  <div className="rounded-lg border border-slate-100 overflow-hidden">
                    <div className="flex justify-between px-3 py-2 border-b border-slate-50 bg-slate-50">
                      <span className="text-slate-500 font-semibold">Property price</span>
                      <strong className="font-mono text-slate-900">${priceNum.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between px-3 py-2 border-b border-slate-50">
                      <span className="text-slate-500 font-semibold">Buyer platform fee (1.0%)</span>
                      <strong className="font-mono text-slate-900">${buyerFeeNum.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between px-3 py-2 border-b border-slate-50 bg-indigo-50/60">
                      <span className="text-indigo-800 font-bold">Total amount payable by Buyer</span>
                      <strong className="font-mono text-indigo-900">${totalBuyerPaid.toLocaleString()} USD</strong>
                    </div>
                    <div className="flex justify-between px-3 py-2 border-b border-slate-50">
                      <span className="text-slate-500 font-semibold">Seller platform fee (1.5%)</span>
                      <strong className="font-mono text-slate-900">${sellerFeeNum.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between px-3 py-2 bg-emerald-50/70">
                      <span className="text-emerald-800 font-bold">Net amount due to Seller</span>
                      <strong className="font-mono text-emerald-800">${sellerNetPayout.toLocaleString()} USD</strong>
                    </div>
                  </div>
                  <ul className="text-[11px] text-slate-700 leading-relaxed space-y-1.5 list-disc pl-4">
                    <li>Buyer shall deposit the total payable amount into EscrowTrust custody before ownership transfer proceeds.</li>
                    <li>Escrowed funds shall not be paid to Seller, refunded to Buyer, or otherwise released except as authorized under this Agreement.</li>
                    <li>Platform fees are earned service charges of EscrowTrust and are deducted as shown in the schedule above.</li>
                  </ul>
                </div>
              </section>

              <section
                data-contract-clause
                data-clause-label="Article 3 — Obligations & Conditions of Release"
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"
              >
                <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest">Article 3 — Obligations & Conditions of Release</p>
                  <span className="text-[9px] font-bold text-slate-300">Duties of each party</span>
                </div>
                <div className="p-4 space-y-3 text-xs sm:text-sm">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Seller shall</p>
                    <ul className="text-[11px] text-slate-700 leading-relaxed space-y-1.5 list-disc pl-4">
                      <li>Deliver accurate ownership and mutation documents required to transfer title to Buyer.</li>
                      <li>Cooperate with registry verification and correct any remediable defect within a reasonable time.</li>
                      <li>Not dispose of, encumber, or otherwise impair the Property while funds remain in escrow.</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Buyer shall</p>
                    <ul className="text-[11px] text-slate-700 leading-relaxed space-y-1.5 list-disc pl-4">
                      <li>Fund escrow with the total payable amount and maintain good-faith participation until completion or lawful termination.</li>
                      <li>Accept transfer of title upon successful verification, subject to the Property matching this Agreement.</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Conditions for release of funds to Seller</p>
                    <ul className="text-[11px] text-slate-700 leading-relaxed space-y-1.5 list-disc pl-4">
                      <li>Mutation / transfer documents have been submitted and administratively verified; and</li>
                      <li>No unresolved dispute or freeze is active against the escrow; and</li>
                      <li>An authorized EscrowTrust administrator approves release of the net amount due to Seller.</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Refund to Buyer</p>
                    <ul className="text-[11px] text-slate-700 leading-relaxed space-y-1.5 list-disc pl-4">
                      <li>If transfer cannot be completed due to material title failure, fraud, or another ground recognized under platform dispute rules, escrowed principal may be refunded to Buyer after administrative determination.</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section
                data-contract-clause
                data-clause-label="Article 4 — Digital Authority & Governing Law"
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"
              >
                <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest">Article 4 — Digital Authority & Governing Law</p>
                  <span className="text-[9px] font-bold text-slate-300">How this Agreement is signed</span>
                </div>
                <div className="p-4 space-y-3 text-xs sm:text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`rounded-lg border p-3 ${buyerAuthorized ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Buyer authorization</p>
                      <p className={`mt-1 font-extrabold ${buyerAuthorized ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {buyerAuthorized ? 'Authorized' : 'Not yet authorized'}
                      </p>
                    </div>
                    <div className={`rounded-lg border p-3 ${sellerAuthorized ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Seller authorization</p>
                      <p className={`mt-1 font-extrabold ${sellerAuthorized ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {sellerAuthorized ? 'Authorized' : 'Not yet authorized'}
                      </p>
                    </div>
                  </div>
                  <ul className="text-[11px] text-slate-700 leading-relaxed space-y-1.5 list-disc pl-4">
                    <li>One-time codes and logged approvals on EscrowTrust constitute each party’s electronic signature and consent to the relevant escrow action.</li>
                    <li>In-app notices, and email/SMS where configured, are valid notice channels for this transaction.</li>
                    <li>This Agreement is governed by the laws of the Republic of Rwanda. Platform dispute procedures apply before court action where required by EscrowTrust rules.</li>
                    <li>If any provision is held unenforceable, the remaining provisions continue in full force.</li>
                  </ul>
                </div>
              </section>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-300 flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                {generateQrSvg()}
                <div>
                  <p className="text-[11px] font-extrabold text-slate-900 uppercase">Live QR Status Check</p>
                  <p className="text-[10px] text-slate-500 max-w-[160px] mt-0.5 leading-tight">
                    Scan to view current escrow status. Final certificate only when COMPLETED.
                  </p>
                  <a href={verificationUrl} target="_blank" rel="noreferrer" className="inline-block text-[10px] font-bold text-amber-600 hover:text-amber-700 underline mt-1">
                    Open Certificate Portal &rarr;
                  </a>
                </div>
              </div>
              <div>{generateBarcodeSvg()}</div>
            </div>

            <div className="mt-6 p-3 bg-slate-900 text-slate-300 rounded-lg text-[10px] font-mono flex flex-col sm:flex-row justify-between items-center gap-2">
              <span className="truncate max-w-md">SHA-256 Checksum: {checksum}</span>
              <span className="text-amber-400 font-bold">STATE: {status || 'PENDING'}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-100 p-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <span className="text-xs text-slate-500 font-semibold">Official Document Preview • EscrowTrust Rwanda</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                if (onOpenPdfModal) onOpenPdfModal();
              }}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>🔒 Download Protected PDF (+ Password & QR)</span>
            </button>
            <button onClick={onClose} className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition">
              Close Preview
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ContractPreviewModal;
