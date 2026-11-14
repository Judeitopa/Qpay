import React from 'react';
import { Camera, ShieldCheck, X, Check, Lock } from 'lucide-react';

export default function CameraPermissionModal({ isOpen, onClose, onSelectOption }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn select-none">
      <div className="relative w-full max-w-[360px] bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-5 animate-scaleUp text-center">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Camera Icon Container */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shadow-xs border border-indigo-100">
          <Camera className="w-8 h-8 stroke-[1.8]" />
        </div>

        {/* Title and Description */}
        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
            Allow Qpay to access camera?
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-[280px] mx-auto">
            Qpay needs camera access to scan merchant payment QR codes and process instant settlements.
          </p>
        </div>

        {/* The 3 Options Requested by User */}
        <div className="space-y-2 pt-1 text-left">
          
          {/* Option 1: Always allow */}
          <button
            type="button"
            onClick={() => onSelectOption('always_allow')}
            className="w-full p-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-semibold shadow-sm transition active:scale-[0.98] flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Always allow</span>
            </div>
            <span className="text-[10px] text-indigo-200 group-hover:text-white transition">Recommended</span>
          </button>

          {/* Option 2: Always ask for permission */}
          <button
            type="button"
            onClick={() => onSelectOption('always_ask')}
            className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-2xl text-xs font-semibold transition active:scale-[0.98] flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Always ask for permission</span>
            </div>
            <span className="text-[10px] text-slate-400">Ask each time</span>
          </button>

          {/* Option 3: Never allow */}
          <button
            type="button"
            onClick={() => onSelectOption('never_allow')}
            className="w-full p-3 bg-white hover:bg-rose-50/60 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 rounded-2xl text-xs font-medium transition active:scale-[0.98] flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-slate-300" />
              <span>Never allow</span>
            </div>
            <span className="text-[10px] text-slate-400">Deny</span>
          </button>

        </div>

        {/* Privacy Note */}
        <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Camera feed is processed locally and never recorded</span>
        </p>

      </div>
    </div>
  );
}
