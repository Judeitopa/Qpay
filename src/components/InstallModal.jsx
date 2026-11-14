import React, { useEffect } from 'react';
import { AlertCircle, Download, X, ExternalLink, Smartphone, CheckCircle2 } from 'lucide-react';
import { playRobloxErrorSound } from '../utils/soundEffects';
import { getDeviceOS, STORE_LINKS } from '../utils/deviceCheck';

/**
 * Clean SaaS Korapay Installation Modal matching the minimalist layout
 */
export default function InstallModal({
  isOpen,
  onClose,
  actionAttempted = 'Scan to Pay',
  onSimulateInstall
}) {
  const os = getDeviceOS();

  if (!isOpen) return null;

  const handleInstallClick = () => {
    if (os === 'ios') {
      window.open(STORE_LINKS.ios, '_blank');
    } else {
      window.open(STORE_LINKS.android, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      {/* Modal Container */}
      <div className="relative w-full max-w-sm bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden p-6 text-center space-y-5 animate-scaleUp">
        
        {/* Close button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon Badge */}
        <div className="mx-auto w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center border border-rose-100">
          <AlertCircle className="w-6 h-6" />
        </div>

        {/* Text */}
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-slate-900">
            Kora needs to be installed
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed px-2">
            To proceed with <strong>{actionAttempted}</strong>, please install the Kora app on your device to authorize payments.
          </p>
        </div>

        {/* OS detection pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200/80 rounded-full text-[11px] text-slate-600">
          <Smartphone className="w-3.5 h-3.5 text-slate-400" />
          <span>Device: {os === 'ios' ? 'iOS (App Store)' : os === 'android' ? 'Android (Google Play)' : 'App Store / Play Store'}</span>
        </div>

        {/* Primary Action Button: "Install" */}
        <div>
          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Install Kora</span>
          </button>
        </div>

        {/* Store links */}
        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <a
            href={STORE_LINKS.android}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 transition"
          >
            <ExternalLink className="w-3 h-3 text-slate-400" />
            <span>Google Play</span>
          </a>
          <a
            href={STORE_LINKS.ios}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 transition"
          >
            <ExternalLink className="w-3 h-3 text-slate-400" />
            <span>App Store</span>
          </a>
        </div>

        {/* Hackathon simulate switch */}
        {onSimulateInstall && (
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onSimulateInstall}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Simulate: "I have Kora installed"</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
