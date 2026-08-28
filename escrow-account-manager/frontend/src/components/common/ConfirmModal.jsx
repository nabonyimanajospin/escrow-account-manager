import React from 'react';

const ConfirmModal = ({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning', // 'warning', 'danger', 'info'
  onConfirm,
  onCancel,
  loading = false,
}) => {
  if (!isOpen) return null;

  const headerColors = {
    warning: 'bg-amber-500 text-white',
    danger: 'bg-rose-600 text-white',
    info: 'bg-indigo-600 text-white',
  };

  const confirmBtnColors = {
    warning: 'bg-amber-600 hover:bg-amber-700 text-white',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white',
    info: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-scale-up space-y-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl font-bold text-lg ${headerColors[type]}`}>
            {type === 'danger' ? '⚠️' : type === 'warning' ? '🔔' : 'ℹ️'}
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 font-sans">{title}</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed mt-0.5">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary py-1.5 px-4 text-xs font-bold"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`btn-primary py-1.5 px-5 text-xs font-extrabold shadow-md ${confirmBtnColors[type]}`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
