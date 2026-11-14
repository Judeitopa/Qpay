import React from 'react';
import { Home, Send, Settings, HelpCircle, User } from 'lucide-react';

export default function IndividualNav({
  currentView,
  isProfileOpen,
  onNavigate,
  onOpenProfile
}) {
  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      isActive: currentView === 'home' && !isProfileOpen,
      onClick: () => onNavigate('home')
    },
    {
      id: 'send',
      label: 'Send',
      icon: Send,
      isActive: currentView === 'send' && !isProfileOpen,
      onClick: () => onNavigate('send')
    },
    {
      id: 'help',
      label: 'Help',
      icon: HelpCircle,
      isActive: currentView === 'help' && !isProfileOpen,
      onClick: () => onNavigate('help')
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      isActive: currentView === 'settings' && !isProfileOpen,
      onClick: () => onNavigate('settings')
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      isActive: isProfileOpen,
      onClick: onOpenProfile
    }
  ];

  return (
    <nav
      aria-label="Individual navigation"
      className="w-full max-w-[504px] sm:max-w-[544px] mx-auto mt-6 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-1.5 flex items-center justify-between gap-1"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-3 sm:px-3.5 py-2.5 rounded-xl text-[11px] sm:text-xs font-semibold transition cursor-pointer ${
              item.isActive
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60'
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0 stroke-[2]" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
