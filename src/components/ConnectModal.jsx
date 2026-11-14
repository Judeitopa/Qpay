import React, { useState } from 'react';
import { X, ShieldCheck, Key, User, Mail, ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import { connectToKorapay, KORAPAY_CONFIG } from '../utils/korapayApi';

export default function ConnectModal({ isOpen, onClose, onConnected }) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(KORAPAY_CONFIG.defaultUser.name);
  const [email, setEmail] = useState(KORAPAY_CONFIG.defaultUser.email);
  const [publicKey, setPublicKey] = useState(KORAPAY_CONFIG.defaultPublicKey);
  const [useCustomKey, setUseCustomKey] = useState(false);

  if (!isOpen) return null;

  const handleConnect = async (e) => {
    e?.preventDefault();
    setLoading(true);

    try {
      const result = await connectToKorapay({
        name: name.trim(),
        email: email.trim(),
        publicKey: useCustomKey ? publicKey.trim() : KORAPAY_CONFIG.defaultPublicKey
      });

      if (result.success) {
        if (onConnected) onConnected(result.user);
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden p-6 text-left space-y-5 animate-scaleUp">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 flex-shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Connect Qpay to Kora
            </h2>
            <p className="text-xs text-slate-500">
              Authorize API rails to send and receive real-time QR payments
            </p>
          </div>
        </div>

        {/* Pre-authenticated Profile Preview */}
        <div className="bg-[#F8FAFD] border border-slate-200/80 rounded-xl p-3.5 flex items-center gap-3">
          <img
            src={KORAPAY_CONFIG.defaultUser.avatar}
            alt="Profile Preview"
            className="w-11 h-11 rounded-full object-cover border border-slate-200"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-900 truncate">
                {name || 'Kora Account'}
              </span>
              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-medium rounded-full border border-emerald-200">
                Verified
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              {email} • Zero-Digit Kora Vault Active
            </p>
          </div>
        </div>

        {/* Connection Form */}
        <form onSubmit={handleConnect} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Account Holder / Business Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition"
                placeholder="e.g. Amara Nwosu"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Kora Registered Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition"
                placeholder="amara@qpay.africa"
              />
            </div>
          </div>

          {/* Toggle Custom Key option */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setUseCustomKey(!useCustomKey)}
              className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              <Key className="w-3 h-3" />
              <span>{useCustomKey ? 'Use Default Sandbox Key' : 'Enter Custom Kora Public Key (pk_test_...)'}</span>
            </button>
          </div>

          {useCustomKey && (
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Kora API Public Key
              </label>
              <input
                type="text"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="pk_test_..."
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          )}

          {/* Security note */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <span>End-to-end encrypted connection with Kora Infrastructure</span>
          </div>

          {/* Action button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-medium shadow-sm transition active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Handshaking with Kora API...</span>
              ) : (
                <>
                  <span>Connect Account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
