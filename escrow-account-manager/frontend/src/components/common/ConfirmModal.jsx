import React from 'react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', danger = false, loading = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl shadow-slate-200 p-7 w-full max-w-md animate-scale-in border border-slate-100">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5 ${
          danger ? 'bg-red-100' : 'bg-primary-100'
        }`}>
          {danger ? (
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>

        <h3 className="text-lg font-bold text-slate-900 text-center mb-2">{title}</h3>
        <p className="text-sm text-slate-500 text-center mb-7 leading-relaxed">{message}</p>

        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 ${danger ? 'btn-danger' : 'btn-primary'}`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </>
            ) : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
