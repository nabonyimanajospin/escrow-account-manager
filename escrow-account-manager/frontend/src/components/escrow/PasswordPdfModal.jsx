import { useState } from 'react';
import axios from '../../api/axiosConfig';
import toast from 'react-hot-toast';

const PasswordPdfModal = ({ isOpen, onClose, transactionId }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await axios.post(
        `/escrow/${transactionId}/pdf`,
        { password: password.trim() },
        { responseType: 'blob' }
      );

      // Create download link for PDF blob
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Escrow_Agreement_${transactionId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(
        password.trim()
          ? 'Encrypted PDF generated & downloaded successfully! Password protected.'
          : 'PDF Agreement downloaded successfully!'
      );
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate protected PDF.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔒</span>
            <h3 className="text-sm font-black uppercase tracking-wider font-sans">Password-Protected PDF</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">✕</button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleDownload} className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
            <p className="font-bold">🔐 Security Safeguard:</p>
            <p>Set a custom password to encrypt your Escrow Agreement PDF. Anyone opening the file will be required to enter this password.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Set PDF Password (Optional)</label>
            <input
              type="password"
              placeholder="Enter encryption password for PDF"
              className="input-field w-full text-xs"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center flex-shrink-0">
              QR
            </div>
            <div>
              <p className="font-bold text-slate-800">Dynamic Status QR Code Included</p>
              <p className="text-[10px] text-slate-400">Scanners can verify live escrow balance & deed status.</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary py-2 px-4 text-xs">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary py-2.5 px-6 font-extrabold text-xs shadow-md"
            >
              {loading ? 'Encrypting & Generating PDF...' : 'Download Encrypted PDF &rarr;'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default PasswordPdfModal;
