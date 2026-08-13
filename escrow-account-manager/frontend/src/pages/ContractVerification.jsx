import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../api/axiosConfig';

const ContractVerification = () => {
  const { checksum } = useParams();
  const [loading, setLoading] = useState(true);
  const [verificationResult, setVerificationResult] = useState(null);

  useEffect(() => {
    const fetchVerification = async () => {
      try {
        setLoading(true);
        const searchSum = decodeURIComponent(checksum || '');
        if (!searchSum) {
          setVerificationResult({
            checksum: 'UNKNOWN',
            verificationStatus: 'INVALID',
            isValid: false,
            isFinal: false,
            message: 'No checksum provided.',
            registryStatus: 'UNVERIFIED / RECORD NOT FOUND',
            authority: 'Rwanda Land Management & Environment Authority (RLMA)',
          });
          return;
        }

        const res = await axios.get(`/escrow/verify-deed/${encodeURIComponent(searchSum)}`);
        if (res.data.success) {
          setVerificationResult(res.data.data);
        }
      } catch (err) {
        console.error(err);
        setVerificationResult({
          checksum: checksum || 'UNKNOWN-CHECKSUM',
          verificationStatus: 'INVALID',
          isValid: false,
          isFinal: false,
          message: err.response?.data?.message || 'Invalid or Unverified Deed Checksum: Record not found in database.',
          verifiedAt: new Date().toISOString(),
          registryStatus: 'UNVERIFIED / RECORD NOT FOUND',
          authority: 'Rwanda Land Management & Environment Authority (RLMA)',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchVerification();
  }, [checksum]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-mono text-slate-300">Checking escrow record against Rwanda Land Registry Node...</p>
      </div>
    );
  }

  const phase = verificationResult?.verificationStatus
    || (verificationResult?.isValid ? 'VERIFIED' : 'INVALID');
  const isFinal = verificationResult?.isFinal === true || phase === 'VERIFIED';
  const isInProgress = phase === 'IN_PROGRESS';
  const isFrozen = phase === 'FROZEN';
  const isClosed = phase === 'CLOSED';
  const isInvalid = phase === 'INVALID' || (!verificationResult?.isValid && !isInProgress && !isFrozen && !isClosed);

  const badge = isFinal
    ? { ring: 'border-emerald-500 bg-emerald-500/10 ring-emerald-500/20', label: 'VERIFIED', sub: 'OFFICIAL', title: 'Official Escrow Contract Verification' }
    : isInProgress
      ? { ring: 'border-amber-500 bg-amber-500/10 ring-amber-500/20', label: 'IN PROGRESS', sub: 'PENDING', title: 'Escrow Deal In Progress — Not Final Yet' }
      : isFrozen
        ? { ring: 'border-rose-500 bg-rose-500/10 ring-rose-500/20', label: 'FROZEN', sub: 'ALERT', title: 'Escrow Record Frozen — Dispute or Fraud Alert' }
        : isClosed
          ? { ring: 'border-slate-500 bg-slate-500/10 ring-slate-500/20', label: 'CLOSED', sub: 'ARCHIVED', title: 'Escrow Deal Closed' }
          : { ring: 'border-rose-500 bg-rose-500/10 ring-rose-500/20', label: 'UNVERIFIED', sub: 'REJECTED', title: 'Invalid / Unverified Contract Deed' };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col items-center justify-center p-4 sm:p-6">
      <div className={`max-w-2xl w-full bg-slate-900 border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden ${
        isFinal ? 'border-slate-800' : isInProgress ? 'border-amber-900/60' : 'border-rose-900/60'
      }`}>

        <div className="absolute top-6 right-6 opacity-90">
          <div className={`w-24 h-24 rounded-full border-2 flex flex-col items-center justify-center text-center p-1 shadow-lg ring-2 ${badge.ring}`}>
            <span className="text-[7px] font-black uppercase tracking-widest text-slate-300">RWANDA LAND</span>
            <span className="text-[9px] font-extrabold text-white">{badge.sub}</span>
            <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full uppercase bg-black/20">{badge.label}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
            isFinal ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              : isInProgress ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
          }`}>
            {isInvalid ? (
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono uppercase font-bold tracking-wider ${
              isFinal ? 'bg-emerald-500/20 text-emerald-400'
                : isInProgress ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-rose-500/20 text-rose-400'
            }`}>
              {isFinal ? 'Final Certificate' : isInProgress ? 'Status Check Only' : 'Verification Rejected'}
            </span>
            <h1 className="text-xl sm:text-2xl font-black mt-1">{badge.title}</h1>
          </div>
        </div>

        <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4 font-mono text-xs">
          <div>
            <span className="text-slate-500 uppercase tracking-wider text-[10px]">Queried SHA-256 / Escrow Checksum</span>
            <p className={`font-bold text-sm break-all mt-0.5 ${isFinal ? 'text-amber-400' : isInProgress ? 'text-amber-300' : 'text-rose-400'}`}>
              {verificationResult?.checksum}
            </p>
          </div>

          {verificationResult?.propertyTitle && (
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px]">Property</span>
              <p className="text-slate-200 font-semibold mt-0.5">{verificationResult.propertyTitle}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px]">Verification Authority</span>
              <p className="text-slate-200 font-semibold mt-0.5">{verificationResult?.authority}</p>
            </div>

            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px]">Registry Status</span>
              <p className={`font-bold mt-0.5 ${isFinal ? 'text-emerald-400' : isInProgress ? 'text-amber-400' : 'text-rose-400'}`}>
                {verificationResult?.registryStatus}
              </p>
            </div>

            {verificationResult?.status && (
              <div>
                <span className="text-slate-500 uppercase tracking-wider text-[10px]">Current Escrow State</span>
                <p className="text-slate-300 font-bold mt-0.5">{verificationResult.status}</p>
              </div>
            )}

            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px]">Checked At</span>
              <p className="text-slate-300 mt-0.5">{new Date(verificationResult?.verifiedAt || Date.now()).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-xl text-xs leading-relaxed border ${
          isFinal ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100'
            : isInProgress ? 'bg-amber-500/10 border-amber-500/30 text-amber-100'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-100'
        }`}>
          {isFinal ? (
            <span><strong>Final certificate:</strong> This deal is COMPLETED. The SHA-256 record matches the immutable escrow ledger entry.</span>
          ) : isInProgress ? (
            <span><strong>Not final yet:</strong> This QR confirms the deal exists in the system, but the escrow process is still active ({verificationResult?.status}). No final land-registry certificate should be accepted until status is COMPLETED.</span>
          ) : isFrozen ? (
            <span><strong>Security alert:</strong> This record is frozen due to dispute or fraud triage. Funds must not be released outside official mediation.</span>
          ) : isClosed ? (
            <span><strong>Deal closed:</strong> This transaction ended as {verificationResult?.status}. It is not an active verified completion certificate.</span>
          ) : (
            <span><strong>Security warning:</strong> {verificationResult?.message || 'This checksum could not be matched to an authentic escrow record.'}</span>
          )}
        </div>

        <div className="flex justify-between items-center pt-2">
          <Link to="/" className="text-xs text-slate-400 hover:text-white font-bold transition flex items-center gap-1">
            &larr; Back to Escrow Platform
          </Link>
          {isFinal ? (
            <button
              onClick={() => window.print()}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold px-4 py-2 rounded-xl transition"
            >
              Print Final Certificate
            </button>
          ) : (
            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-2 rounded-xl">
              Download / print disabled until COMPLETED
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractVerification;
