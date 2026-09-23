import React from 'react';
import { useDigitalTwinStore } from '../../store/useDigitalTwinStore';
import { 
  Clock, 
  RotateCcw, 
  Video, 
  Activity, 
  Compass 
} from 'lucide-react';

export function MissionStatusRibbon() {
  const { telemetry, setActiveView } = useDigitalTwinStore();

  const flightSecs = telemetry?.flightTimeSeconds || 4363;
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="gcs-panel p-4 flex flex-col gap-3.5 bg-[#0D1420] border border-slate-800">
      {/* ── Top 4 Sparkline Cards ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* 1. Log Entries */}
        <div className="p-3 rounded-xl bg-[#131C2B] border border-slate-800/80 flex flex-col justify-between h-20 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Log Entries</span>
            <div className="flex items-end gap-1 h-3">
              <div className="w-1 h-1.5 bg-emerald-400 rounded-sm shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
              <div className="w-1 h-2.5 bg-emerald-400 rounded-sm shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
              <div className="w-1 h-3 bg-emerald-400 rounded-sm shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
              <div className="w-1 h-2 bg-orange-400 rounded-sm shadow-[0_0_4px_rgba(251,146,60,0.8)]" />
            </div>
          </div>
          <span className="text-sm font-bold text-slate-100 font-mono">8 / 2</span>
        </div>

        {/* 2. Waypoints */}
        <div className="p-3 rounded-xl bg-[#131C2B] border border-slate-800/80 flex flex-col justify-between h-20 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Waypoints</span>
            <svg className="w-8 h-3 stroke-orange-400 fill-none filter drop-shadow-[0_0_3px_rgba(249,115,22,0.8)]" viewBox="0 0 32 12">
              <path d="M0,10 Q8,2 16,7 T32,2" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-sm font-bold text-slate-100 font-mono">04</span>
        </div>

        {/* 3. Secure Link */}
        <div className="p-3 rounded-xl bg-[#131C2B] border border-slate-800/80 flex flex-col justify-between h-20 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Secure link</span>
            <svg className="w-8 h-3 stroke-emerald-400 fill-none filter drop-shadow-[0_0_3px_rgba(52,211,153,0.8)]" viewBox="0 0 32 12">
              <path d="M0,8 Q8,10 16,3 T32,5" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-xs font-bold text-emerald-400">Encrypted</span>
        </div>

        {/* 4. Satellite Link */}
        <div className="p-3 rounded-xl bg-[#131C2B] border border-slate-800/80 flex flex-col justify-between h-20 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Satellite link</span>
            <svg className="w-8 h-3 stroke-emerald-400 fill-none filter drop-shadow-[0_0_3px_rgba(52,211,153,0.8)]" viewBox="0 0 32 12">
              <path d="M0,6 Q8,2 16,8 T32,3" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-xs font-bold text-emerald-400">Connected</span>
        </div>
      </div>

      {/* ── Mission Status Rows ───────────────────────────────── */}
      <div className="flex flex-col gap-2">
        {/* Flight Time Elapsed */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#131C2B] border border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-medium">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span className="uppercase tracking-wider">FLIGHT TIME ELAPSED</span>
          </div>
          <span className="text-slate-100 font-mono font-bold text-sm">
            {formatTime(flightSecs)}
          </span>
        </div>

        {/* ETA Return */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#131C2B] border border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-medium">
            <RotateCcw className="w-4 h-4 text-emerald-400" />
            <span className="uppercase tracking-wider">ETA (RETURN)</span>
          </div>
          <span className="text-slate-100 font-mono font-bold text-sm">
            00:48:00
          </span>
        </div>

        {/* Mission Role */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#131C2B] border border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-medium">
            <Compass className="w-4 h-4 text-emerald-400" />
            <span className="uppercase tracking-wider">MISSION ROLE</span>
          </div>
          <span className="text-slate-200 font-bold tracking-wide">
            ISR / SURVEILLANCE & PROPULSION
          </span>
        </div>

        {/* Payload */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#131C2B] border border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-medium">
            <Video className="w-4 h-4 text-emerald-400" />
            <span className="uppercase tracking-wider">PAYLOAD</span>
          </div>
          <span className="text-slate-200 font-bold tracking-wide">
            EO/IR - 4K - LASER
          </span>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#131C2B] border border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-medium">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="uppercase tracking-wider">STATUS</span>
          </div>
          <span className="text-emerald-400 font-extrabold text-xs tracking-wider uppercase">
            ON PATROL
          </span>
        </div>
      </div>

      {/* ── Action Buttons ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          onClick={() => setActiveView('tactical-twin')}
          className="gcs-button py-3 px-4 flex items-center justify-center gap-2 text-xs text-slate-200 hover:text-emerald-300"
        >
          <Video className="w-4 h-4 text-slate-400" />
          VIEW FEED
        </button>

        <button
          onClick={() => setActiveView('ai-analytics')}
          className="gcs-button py-3 px-4 flex items-center justify-center gap-2 text-xs bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60"
        >
          <Activity className="w-4 h-4 text-emerald-400" />
          SYSTEM STATUS
        </button>
      </div>
    </div>
  );
}
