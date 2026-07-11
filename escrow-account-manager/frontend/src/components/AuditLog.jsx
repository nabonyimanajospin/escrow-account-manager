import { useState } from 'react';
import toast from 'react-hot-toast';

const AuditLog = ({ logs }) => {
  const [copiedId, setCopiedId] = useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Value copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };



  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-6 text-slate-500 text-sm font-medium">
        No ledger records found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cryptographic Block Ledger</p>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 font-bold">
          SHA-256 Secured
        </span>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
        {logs.map((log, index) => {
          const isGenesis = index === logs.length - 1;
          return (
            <div key={log.id || index} className="p-3.5 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 shadow-inner flex flex-col gap-2 relative">
              

              {/* Header / Meta */}
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  BLOCK #{logs.length - index}
                  {isGenesis && (
                    <span className="text-[7px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1 py-0.5 rounded font-sans tracking-wide ml-2 uppercase font-extrabold">
                      Genesis Block
                    </span>
                  )}
                </span>
                <span>{new Date(log.timestamp).toLocaleString()}</span>
              </div>

              {/* Action Description */}
              <p className="text-sm font-semibold text-white leading-snug">{log.action}</p>

              {/* User Actor details */}
              <div className="text-[11px] text-slate-400 font-medium">
                Actor: <span className="text-sky-400">{log.userName || 'System'}</span> ({log.userRole || 'SYSTEM'})
              </div>

              {/* Cryptographic Ledger Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800 text-[10px] font-mono leading-none">
                {/* Block Hash */}
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500 font-semibold uppercase">Block Hash</span>
                  <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded border border-slate-800">
                    <span className="text-emerald-400 flex-grow truncate">{log.hash}</span>
                    <button
                      onClick={() => copyToClipboard(log.hash, `hash-${log.id}`)}
                      className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                    >
                      {copiedId === `hash-${log.id}` ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Digital Signature */}
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500 font-semibold uppercase">Digital Signature</span>
                  <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded border border-slate-800">
                    <span className="text-sky-400 flex-grow truncate">{log.signature}</span>
                    <button
                      onClick={() => copyToClipboard(log.signature, `sig-${log.id}`)}
                      className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                    >
                      {copiedId === `sig-${log.id}` ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AuditLog;
