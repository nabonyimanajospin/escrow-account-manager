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
        const searchSum = checksum || '1';
        const res = await axios.get(`/escrow/verify-deed/${searchSum}`);
        if (res.data.success) {
          setVerificationResult(res.data.data);
        }
      } catch (err) {
        console.error(err);
        setVerificationResult({
          checksum: checksum || 'UNKNOWN-CHECKSUM',
          isValid: false,
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
        <p className="text-sm font-mono text-slate-300">Verifying document SHA-256 checksum on Rwanda Land Registry Node...</p>
      </div>
    );
  }

  const isVerified = verificationResult?.isValid === true;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col items-center justify-center p-4 sm:p-6">
      <div className={`max-w-2xl w-full bg-slate-900 border ${isVerified ? 'border-slate-800' : 'border-rose-900/60'} rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden`}>
        
        {/* Stamp Badge */}
        <div className="absolute top-6 right-6 opacity-90">
          <div className={`w-24 h-24 rounded-full border-2 ${isVerified ? 'border-emerald-500 bg-emerald-500/10 ring-emerald-500/20' : 'border-rose-500 bg-rose-500/10 ring-rose-500/20'} flex flex-col items-center justify-center text-center p-1 shadow-lg ring-2`}>
            <span className={`text-[7px] font-black uppercase tracking-widest ${isVerified ? 'text-emerald-400' : 'text-rose-400'}`}>RWANDA LAND</span>
            <span className={`text-[9px] font-extrabold ${isVerified ? 'text-emerald-300' : 'text-rose-300'}`}>
              {isVerified ? 'OFFICIAL' : 'REJECTED'}
            </span>
            <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded-full uppercase ${isVerified ? 'text-emerald-400 bg-emerald-500/30' : 'text-rose-400 bg-rose-500/30'}`}>
              {isVerified ? 'VERIFIED' : 'UNVERIFIED'}
            </span>
          </div>
        </div>

        {/* Verification Header */}
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${isVerified ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border-rose-500/40'}`}>
            {isVerified ? (
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <div>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono uppercase font-bold tracking-wider ${isVerified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              {isVerified ? 'Cryptographically Authentic' : 'Verification Rejected'}
            </span>
            <h1 className="text-xl sm:text-2xl font-black mt-1">
              {isVerified ? 'Official Escrow Contract Verification' : 'Invalid / Unverified Contract Deed'}
            </h1>
          </div>
        </div>

        {/* Details Grid */}
        <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4 font-mono text-xs">
          <div>
            <span className="text-slate-500 uppercase tracking-wider text-[10px]">Queried SHA-256 Deed Checksum</span>
            <p className={`font-bold text-sm break-all mt-0.5 ${isVerified ? 'text-amber-400' : 'text-rose-400'}`}>
              {verificationResult?.checksum}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px]">Verification Authority</span>
              <p className="text-slate-200 font-semibold mt-0.5">{verificationResult?.authority}</p>
            </div>

            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px]">Registry Status</span>
              <p className={`font-bold mt-0.5 ${isVerified ? 'text-emerald-400' : 'text-rose-400'}`}>
                {verificationResult?.registryStatus}
              </p>
            </div>

            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px]">EVM Smart Contract</span>
              <p className="text-slate-300 font-mono text-[11px] truncate mt-0.5">
                {verificationResult?.escrowContractAddress || verificationResult?.smartContractAddress || 'N/A'}
              </p>
            </div>

            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px]">Verified Timestamp</span>
              <p className="text-slate-300 mt-0.5">{new Date(verificationResult?.verifiedAt || Date.now()).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Notice */}
        <div className={`p-4 rounded-xl text-xs leading-relaxed border ${isVerified ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-rose-500/10 border-rose-500/30 text-rose-200'}`}>
          {isVerified ? (
            <span><strong>Security Guarantee:</strong> This contract record is tamper-evident. The document SHA-256 hash matches the immutable ledger record on the national escrow blockchain node.</span>
          ) : (
            <span><strong>Security Warning:</strong> This deed checksum hash could not be matched with any authentic transaction on the Rwanda Escrow Vault. This document may be modified or invalid.</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-2">
          <Link
            to="/"
            className="text-xs text-slate-400 hover:text-white font-bold transition flex items-center gap-1"
          >
            &larr; Back to Escrow Platform
          </Link>
          <button
            onClick={() => window.print()}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold px-4 py-2 rounded-xl transition"
          >
            Print Certificate
          </button>
        </div>

      </div>
    </div>
  );
};

export default ContractVerification;
