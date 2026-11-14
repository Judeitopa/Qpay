import React from 'react';

/**
 * Compact 2D Animated Old Paper Style Tag for Returning Customers
 * Displays "x2 R", "x3 R", "x4 R" (where R represents Returning)
 */
export default function VintagePaperTag({ count }) {
  return (
    <div 
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#FAF3DE] border border-dashed border-[#D2BA85] shadow-[0_1px_2px_rgba(120,70,20,0.1)] hover:scale-110 transition-transform origin-left animate-tagSway select-none cursor-default"
      title={`${count}x Returning Customer`}
    >
      {/* Miniature 2D punched tag eyelet hole */}
      <span className="w-1.5 h-1.5 rounded-full bg-[#E8D4A6] border border-[#9A7A3E] shadow-inner flex items-center justify-center flex-shrink-0">
        <span className="w-0.5 h-0.5 rounded-full bg-[#FAF3DE]" />
      </span>
      
      {/* Multiplier e.g. x2, x3, x4 */}
      <span className="font-mono font-black text-[9px] px-1 py-0.2 rounded bg-[#7C2D12] text-[#FEF3C7] tracking-tight leading-none">
        x{count}
      </span>

      {/* "R" representing Returning */}
      <span className="text-[9px] font-black tracking-wider text-[#582A0C] font-serif leading-none">
        R
      </span>
    </div>
  );
}
