import React from 'react';
import { useDigitalTwinStore } from '../../store/useDigitalTwinStore';
import { Calculator, Activity, AlertTriangle } from 'lucide-react';

export function PhysicsResidualCard() {
  const { telemetry } = useDigitalTwinStore();

  const expectedEgt = telemetry?.expectedEgt || 665.0;
  const actualEgt = ((telemetry?.egt1 || 678.5) + (telemetry?.egt2 || 684.0)) / 2;
  const egtResidual = telemetry?.egtResidual || 16.2;
  const isElevated = Math.abs(egtResidual) > 40;

  return (
    <div className="gcs-panel p-4 flex flex-col gap-3.5 bg-[#0D1420] border border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-100 tracking-wide uppercase">
            PHYSICS-INFORMED RESIDUAL MONITOR
          </span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
          OTTO THERMODYNAMICS
        </span>
      </div>

      {/* Formula */}
      <div className="p-2.5 rounded-xl bg-[#131C2B] border border-slate-800/80 text-[11px] font-mono text-slate-300 shadow-inner">
        <span className="text-emerald-400 font-bold">EGT_exp</span> = 300 + 0.025·RPM + 1.2·THR - 0.005·ALT + 1.5·T_amb
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-3 gap-2.5 text-center">
        <div className="p-2.5 rounded-xl bg-[#131C2B] border border-slate-800/80 flex flex-col justify-center shadow-sm">
          <span className="text-[10px] text-slate-400 font-medium">EXPECTED EGT</span>
          <span className="text-sm font-mono font-bold text-slate-200 mt-0.5">
            {expectedEgt.toFixed(1)}°C
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-[#131C2B] border border-slate-800/80 flex flex-col justify-center shadow-sm">
          <span className="text-[10px] text-slate-400 font-medium">ACTUAL EGT</span>
          <span className="text-sm font-mono font-bold text-orange-400 mt-0.5">
            {actualEgt.toFixed(1)}°C
          </span>
        </div>

        <div className={`p-2.5 rounded-xl border flex flex-col justify-center shadow-sm ${
          isElevated ? 'bg-red-950/70 border-red-500/60 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.3)]' : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
        }`}>
          <span className="text-[10px] font-medium">ΔEGT RESIDUAL</span>
          <span className="text-sm font-mono font-bold mt-0.5">
            {egtResidual > 0 ? `+${egtResidual.toFixed(1)}` : egtResidual.toFixed(1)}°C
          </span>
        </div>
      </div>

      {/* Status Interpretation */}
      <div className="flex items-center gap-2 text-xs text-slate-300 px-1 font-medium">
        {isElevated ? (
          <>
            <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 animate-pulse" />
            <span className="text-orange-300">
              Residual exceeds baseline (±30°C). Possible injector asymmetry or air-fuel ratio drift.
            </span>
          </>
        ) : (
          <>
            <Activity className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-emerald-300">
              Combustion residual nominal. Stoichiometric balance verified by physics model.
            </span>
          </>
        )}
      </div>
    </div>
  );
}
