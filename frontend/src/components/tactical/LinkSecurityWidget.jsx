import React from 'react';
import { ShieldCheck, Lock, Signal, Clock } from 'lucide-react';

export function LinkSecurityWidget() {
  return (
    <div className="flex flex-col gap-2 bg-[#0F1420]/85 backdrop-blur-xl border border-slate-700/60 p-3 rounded-2xl shadow-2xl select-none min-w-[280px]">
      {/* Header */}
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 uppercase tracking-wider">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>LINK SECURITY</span>
      </div>

      {/* 3-Column Stats Grid */}
      <div className="grid grid-cols-3 divide-x divide-slate-700/60 pt-0.5">
        {/* Column 1: Encryption */}
        <div className="flex flex-col pr-3">
          <div className="flex items-center gap-1 text-[9px] font-sans text-slate-400 font-medium">
            <Lock className="w-2.5 h-2.5 text-slate-400" />
            <span>ENCRYPTION</span>
          </div>
          <span className="text-xs font-mono font-bold text-slate-100 mt-0.5">
            AES-256
          </span>
        </div>

        {/* Column 2: Link Strength */}
        <div className="flex flex-col px-3">
          <div className="flex items-center gap-1 text-[9px] font-sans text-slate-400 font-medium">
            <Signal className="w-2.5 h-2.5 text-emerald-400" />
            <span>LINK STRENGTH</span>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
            STRONG
          </span>
        </div>

        {/* Column 3: Latency */}
        <div className="flex flex-col pl-3">
          <div className="flex items-center gap-1 text-[9px] font-sans text-slate-400 font-medium">
            <Clock className="w-2.5 h-2.5 text-emerald-400" />
            <span>LATENCY</span>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
            28ms
          </span>
        </div>
      </div>
    </div>
  );
}
