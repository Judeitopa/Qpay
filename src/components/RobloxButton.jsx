import React from 'react';
import { playRobloxClickSound } from '../utils/soundEffects';

/**
 * Roblox-style 3D chunky tactile button
 * Features:
 * - 3D bevel with thick bottom border
 * - Press-down translation on click
 * - Glossy top highlight
 * - Times New Roman bold italic text
 * - Sound effect on click
 */
export default function RobloxButton({
  children,
  onClick,
  variant = 'blue', // 'blue' (Korapay blue), 'teal' (Korapay green/teal), 'coral' (Korapay red/alert), 'navy', 'gold'
  size = 'lg',      // 'md', 'lg', 'xl'
  fullWidth = true,
  disabled = false,
  className = '',
  icon: Icon,
  badgeText
}) {
  const handleClick = (e) => {
    if (disabled) return;
    playRobloxClickSound();
    if (onClick) onClick(e);
  };

  // Color variants for Roblox 3D button
  const variants = {
    blue: {
      bg: 'bg-gradient-to-b from-[#1C7CFF] to-[#0055D4]',
      border: 'border-[#003C9E]',
      shadow: 'shadow-[0_8px_0_#003180,0_12px_24px_rgba(0,102,245,0.45)]',
      activeShadow: 'active:shadow-[0_2px_0_#003180,0_4px_10px_rgba(0,102,245,0.3)]',
      text: 'text-white',
      stud: 'bg-[#5CA6FF]/30'
    },
    teal: {
      bg: 'bg-gradient-to-b from-[#00E594] to-[#00B870]',
      border: 'border-[#008A54]',
      shadow: 'shadow-[0_8px_0_#006D42,0_12px_24px_rgba(0,210,132,0.45)]',
      activeShadow: 'active:shadow-[0_2px_0_#006D42,0_4px_10px_rgba(0,210,132,0.3)]',
      text: 'text-[#062414]',
      stud: 'bg-white/40'
    },
    coral: {
      bg: 'bg-gradient-to-b from-[#FF5E6D] to-[#E82638]',
      border: 'border-[#AD1120]',
      shadow: 'shadow-[0_8px_0_#870B18,0_12px_24px_rgba(232,38,56,0.45)]',
      activeShadow: 'active:shadow-[0_2px_0_#870B18,0_4px_10px_rgba(232,38,56,0.3)]',
      text: 'text-white',
      stud: 'bg-white/30'
    },
    navy: {
      bg: 'bg-gradient-to-b from-[#1A345C] to-[#0F223D]',
      border: 'border-[#081527]',
      shadow: 'shadow-[0_6px_0_#040B14,0_10px_20px_rgba(0,0,0,0.5)]',
      activeShadow: 'active:shadow-[0_2px_0_#040B14,0_4px_8px_rgba(0,0,0,0.4)]',
      text: 'text-slate-100',
      stud: 'bg-white/20'
    },
    gold: {
      bg: 'bg-gradient-to-b from-[#FFD026] to-[#E09D00]',
      border: 'border-[#A37000]',
      shadow: 'shadow-[0_8px_0_#7A5400,0_12px_24px_rgba(224,157,0,0.45)]',
      activeShadow: 'active:shadow-[0_2px_0_#7A5400,0_4px_10px_rgba(224,157,0,0.3)]',
      text: 'text-[#302000]',
      stud: 'bg-white/40'
    }
  };

  const currentVariant = variants[variant] || variants.blue;

  const sizes = {
    md: 'py-3 px-5 text-lg rounded-2xl',
    lg: 'py-5 px-6 text-2xl rounded-2xl md:rounded-3xl',
    xl: 'py-6 px-8 text-3xl rounded-3xl'
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`
        group relative select-none font-serif font-bold italic tracking-wide
        transition-all duration-100 transform
        active:translate-y-2 focus:outline-none
        border-t-2 border-l-2 border-r-2 border-b-[8px]
        ${currentVariant.bg}
        ${currentVariant.border}
        ${currentVariant.shadow}
        ${currentVariant.activeShadow}
        ${currentVariant.text}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed filter grayscale' : 'cursor-pointer hover:brightness-105'}
        ${className}
      `}
    >
      {/* Top Gloss Highlights for Roblox Plastic Sheen */}
      <div className="absolute top-1 left-2 right-2 h-1/3 bg-white/20 rounded-t-xl pointer-events-none" />

      {/* Roblox Stud Accent Dots at corner */}
      <div className="absolute top-2 right-3 flex gap-1.5 opacity-60 pointer-events-none">
        <div className={`w-2 h-2 rounded-full shadow-inner ${currentVariant.stud}`} />
        <div className={`w-2 h-2 rounded-full shadow-inner ${currentVariant.stud}`} />
      </div>

      {badgeText && (
        <span className="absolute -top-3.5 -left-2 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-sans not-italic text-xs font-black uppercase px-2.5 py-0.5 rounded-full border border-amber-200 shadow-md transform -rotate-3">
          {badgeText}
        </span>
      )}

      {/* Button Content */}
      <div className="relative flex items-center justify-center gap-3 drop-shadow-sm">
        {Icon && <Icon className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5]" />}
        <span className="drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]">
          {children}
        </span>
      </div>
    </button>
  );
}
