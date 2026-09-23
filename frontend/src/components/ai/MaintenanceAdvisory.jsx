import React, { useState } from 'react';
import { useDigitalTwinStore } from '../../store/useDigitalTwinStore';
import { Wrench, Clock, Check, ShieldAlert } from 'lucide-react';

export function MaintenanceAdvisory() {
  const { diagnostics, addAlert } = useDigitalTwinStore();
  const { maintenanceDirective } = diagnostics;
  const [isLogged, setIsLogged] = useState(false);

  const handleLogDirective = () => {
    setIsLogged(true);
    addAlert({
      subsystem: 'MAINTENANCE',
      severity: maintenanceDirective.level,
      message: `Directive Logged to Ground Station: [${maintenanceDirective.code}] - ${maintenanceDirective.badge}`,
    });
    setTimeout(() => setIsLogged(false), 3000);
  };

  const isCritical = maintenanceDirective.level === 'CRITICAL';
  const isWarning = maintenanceDirective.level === 'WARNING';

  return (
    <div className="gcs-panel p-4 flex flex-col gap-3.5 bg-[#0D1420] border border-slate-800 shadow-2xl rounded-2xl select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-100 tracking-wide uppercase font-mono">
            AUTONOMOUS MAINTENANCE ADVISORY
          </span>
        </div>
        <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
          isCritical
            ? 'bg-red-950/80 text-red-300 border-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse'
            : isWarning
            ? 'bg-amber-950/80 text-amber-300 border-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
            : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
        }`}>
          {maintenanceDirective.badge}
        </span>
      </div>

      {/* Advisory Content Card */}
      <div className="p-3.5 rounded-xl bg-[#131C2B] border border-slate-800/80 flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-emerald-400 font-mono font-bold">TASK CODE: {maintenanceDirective.code}</span>
          <span className="text-slate-400 flex items-center gap-1 font-mono text-[11px] font-semibold">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            TIMEFRAME: {maintenanceDirective.etaHours === 0 ? 'IMMEDIATE RTB' : `${maintenanceDirective.etaHours} hrs`}
          </span>
        </div>

        <p className="text-xs text-slate-200 leading-relaxed font-medium">
          {maintenanceDirective.action}
        </p>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={handleLogDirective}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition-all ${
              isLogged
                ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                : 'bg-[#1b263b] hover:bg-[#253552] text-slate-200 border border-slate-700 py-1.5 px-3 text-xs'
            }`}
          >
            {isLogged ? <Check className="w-3.5 h-3.5" /> : <Wrench className="w-3.5 h-3.5 text-slate-400" />}
            {isLogged ? 'DIRECTIVE LOGGED' : 'LOG TO GROUND CREW'}
          </button>
        </div>
      </div>
    </div>
  );
}
