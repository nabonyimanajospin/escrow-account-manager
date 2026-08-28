import React from 'react';

const SimulatedNotificationModal = ({
  isOpen,
  userEmail,
  userPhone,
  otpCode,
  onAutoFillAndProceed,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-scale-up space-y-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xl">
            📱
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 font-sans">
              Email & SMS Verification Dispatch Notice
            </h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed mt-0.5">
              Simulated notification dispatch sent to email <strong>{userEmail || 'on file'}</strong> and SMS <strong>{userPhone || '+250788123456'}</strong>.
            </p>
          </div>
        </div>

        <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
          <p className="text-xs font-bold text-indigo-950">Did you receive the notification on your device?</p>
          <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-indigo-100 text-xs font-mono">
            <span className="text-slate-500 font-bold">Issued OTP Approval Code:</span>
            <span className="font-extrabold text-emerald-600 text-sm tracking-widest">{otpCode || '123456'}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary py-2 px-4 text-xs font-bold text-slate-600"
          >
            No / Resend Code
          </button>
          <button
            type="button"
            onClick={() => onAutoFillAndProceed(otpCode)}
            className="btn-primary py-2 px-5 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
          >
            Yes, I Received Code — Auto-Fill & Proceed &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimulatedNotificationModal;
