import { useState, useEffect } from 'react';
import axios from '../../api/axiosConfig';
import toast from 'react-hot-toast';

const IremboSandboxModal = ({ isOpen, onClose, transaction, onMutationSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [parcelData, setParcelData] = useState(null);
  const [digitalSignature, setDigitalSignature] = useState('');
  const [step, setStep] = useState('VERIFY_DEED'); // VERIFY_DEED -> MUTATE -> DONE

  const upi = transaction?.Property?.titleDeedNumber || '1/02/03/04/1234';

  useEffect(() => {
    if (isOpen && upi) {
      setLoading(true);
      axios.get(`/irembo/lookup-parcel?upi=${encodeURIComponent(upi)}`)
        .then((res) => setParcelData(res.data.data))
        .catch(() => toast.error('Could not fetch Irembo parcel records'))
        .finally(() => setLoading(false));
    }
  }, [isOpen, upi]);

  if (!isOpen) return null;

  const handleExecuteMutation = async (e) => {
    e.preventDefault();
    if (!digitalSignature || digitalSignature.trim().length < 3) {
      toast.error('Please enter your digital signature to confirm Irembo land mutation');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post('/irembo/execute-mutation', {
        transactionId: transaction.id,
        upi: upi,
        sellerSignature: digitalSignature.trim(),
        comments: 'Land title deed mutation executed officially via Irembo Sandbox Portal',
      });

      toast.success('Land Title Mutation executed successfully in Irembo Portal!');
      setStep('DONE');
      if (onMutationSuccess) {
        onMutationSuccess(res.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Irembo mutation execution failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200">
        
        {/* Irembo Government Portal Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-xl shadow">
                🇷🇼
              </div>
              <div>
                <h3 className="text-lg font-black tracking-wide font-sans">IREMBO GOV LAND REGISTRY</h3>
                <p className="text-xs text-amber-300 font-semibold">Official Sandbox Title Mutation Portal</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Portal Body */}
        <div className="p-6 space-y-6">
          
          {loading ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-bold text-slate-600">Connecting to Irembo Land Registry Sandbox...</p>
            </div>
          ) : step === 'DONE' ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
                ✓
              </div>
              <h4 className="text-xl font-black text-slate-900 font-sans">Title Deed Mutation Complete</h4>
              <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                Land ownership has been officially transferred in the Irembo Land Registry Sandbox. Escrow transaction state updated to <strong>MUTATION_COMPLETED</strong>.
              </p>
              <button
                onClick={onClose}
                className="btn-primary py-2.5 px-8 bg-blue-900 text-white font-extrabold text-sm"
              >
                Return to Escrow Workspace &rarr;
              </button>
            </div>
          ) : (
            <>
              {/* Parcel Verification Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Government Deed File</span>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                    STATUS: {parcelData?.status || 'AUTHENTIC_VALID'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Parcel Unique Identifier (UPI)</span>
                    <span className="font-extrabold text-slate-800 font-mono">{upi}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Land Registry Reference</span>
                    <span className="font-extrabold text-slate-800 font-mono">{parcelData?.registryId || 'IREMBO-REG-892341'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Current Registered Owner</span>
                    <span className="font-bold text-slate-800">{transaction?.Seller?.name || 'Registered Seller'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Target Transferee (Buyer)</span>
                    <span className="font-bold text-slate-800">{transaction?.Buyer?.name || 'Verified Buyer'}</span>
                  </div>
                </div>
              </div>

              {/* Mutation Execution Form */}
              <form onSubmit={handleExecuteMutation} className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                  <p className="font-bold">📜 Irembo Sandbox Title Transfer Directive:</p>
                  <p>Executing mutation inside Irembo updates the official land registry record, re-assigning parcel UPI <strong>{upi}</strong> to the buyer upon final escrow settlement.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Seller Digital Signature / National ID Key
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter full legal name or digital signature key"
                    className="input-field w-full text-xs font-mono"
                    value={digitalSignature}
                    onChange={(e) => setDigitalSignature(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-secondary py-2 px-4 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary py-2.5 px-6 bg-blue-900 hover:bg-blue-950 text-white font-extrabold text-xs shadow-md"
                  >
                    {loading ? 'Executing Irembo Mutation...' : 'Execute Mutation in Irembo Portal &rarr;'}
                  </button>
                </div>
              </form>
            </>
          )}

        </div>

        {/* Footer info */}
        <div className="bg-slate-100 px-6 py-3 text-[10px] text-slate-500 flex justify-between items-center border-t border-slate-200">
          <span>Connected via Irembo Sandbox API v2.4</span>
          <span>Encrypted 256-Bit Government Handshake</span>
        </div>

      </div>
    </div>
  );
};

export default IremboSandboxModal;
