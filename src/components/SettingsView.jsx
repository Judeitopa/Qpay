import React, { useState } from 'react';
import {
  ArrowLeft,
  Settings,
  ShieldCheck,
  Camera,
  Bell,
  Lock,
  ChevronRight,
  CheckCircle2,
  UserCheck
} from 'lucide-react';

export default function SettingsView({ onBack, registeredUser, onOpenProfile, onOpenTransactions }) {
  const [cameraPerm, setCameraPerm] = useState(() => {
    return localStorage.getItem('qpay_camera_permission') || 'always_ask';
  });

  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem('qpay_individual_settings');
      return saved
        ? JSON.parse(saved)
        : {
            txAlerts: true,
            emailReceipts: true,
            biometricConfirm: false
          };
    } catch (e) {
      return {
        txAlerts: true,
        emailReceipts: true,
        biometricConfirm: false
      };
    }
  });

  const [savedNotice, setSavedNotice] = useState('');

  const handleCameraPermChange = (val) => {
    setCameraPerm(val);
    localStorage.setItem('qpay_camera_permission', val);
    setSavedNotice('Camera permission preference updated.');
    setTimeout(() => setSavedNotice(''), 2500);
  };

  const handleTogglePref = (key) => {
    setPrefs((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem('qpay_individual_settings', JSON.stringify(updated));
      return updated;
    });
    setSavedNotice('Settings preference saved.');
    setTimeout(() => setSavedNotice(''), 2500);
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-5 animate-fadeIn px-2 sm:px-0">
      
      {/* Top Header */}
      <div className="flex items-center justify-between bg-white border border-slate-100 p-4 rounded-3xl shadow-sm">
        <button
          onClick={onBack}
          type="button"
          className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verified Settings</span>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center border border-indigo-100">
              <Settings className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Account Settings</h2>
              <p className="text-xs text-slate-500">
                Manage scanner access, security and notifications
              </p>
            </div>
          </div>

          {savedNotice && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full animate-fadeIn">
              <CheckCircle2 className="w-3 h-3" />
              <span>{savedNotice}</span>
            </span>
          )}
        </div>

        {/* Camera Scanner Permission Section */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Camera className="w-4 h-4 text-indigo-600" />
            <span>Scan to Pay Camera Permission</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { id: 'always_allow', label: 'Always allow' },
              { id: 'always_ask', label: 'Always ask' },
              { id: 'never_allow', label: 'Never allow' }
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleCameraPermChange(opt.id)}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  cameraPerm === opt.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications & Security Switches */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Bell className="w-4 h-4 text-indigo-600" />
            <span>Notifications & Security</span>
          </div>

          <div className="space-y-2">
            {[
              {
                key: 'txAlerts',
                title: 'Instant Payment Alerts',
                desc: 'Show confirmation alerts after QR scans and bank transfers'
              },
              {
                key: 'emailReceipts',
                title: 'Email Transaction Receipts',
                desc: `Send copies to ${registeredUser?.email || 'your email'}`
              },
              {
                key: 'biometricConfirm',
                title: 'Enhanced Transfer Verification',
                desc: 'Extra confirmation step before outbound bank transfers'
              }
            ].map((item) => (
              <div
                key={item.key}
                onClick={() => handleTogglePref(item.key)}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFD] border border-slate-200/70 hover:border-indigo-200 transition cursor-pointer"
              >
                <div className="pr-3">
                  <p className="text-xs font-semibold text-slate-900">{item.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                </div>
                <div
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors flex-shrink-0 ${
                    prefs[item.key] ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                      prefs[item.key] ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Navigation Shortcuts */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onOpenProfile}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/20 transition cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800">Profile & Tier Verification</p>
                <p className="text-[11px] text-slate-400">
                  Current status: Tier {registeredUser?.tier || 1} Account
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            type="button"
            onClick={onOpenTransactions}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/20 transition cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800">View Monthly Transaction History</p>
                <p className="text-[11px] text-slate-400">Review documented monthly records</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>

      </div>

    </div>
  );
}
