import React from 'react';
import { useDigitalTwinStore } from '../../store/useDigitalTwinStore';
import { Cpu, CheckCircle2, AlertOctagon } from 'lucide-react';

export function HealthIndexAndRul() {
  const { diagnostics } = useDigitalTwinStore();
  const { 
    healthScore, 
    healthPercent, 
    healthStatus, 
    predictedFault, 
    faultConfidence, 
    estimatedRulHours 
  } = diagnostics;

  return (
    <div className="gcs-panel p-4 flex flex-col gap-3.5 bg-[#0D1420] border border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-100 tracking-wide uppercase">
            XGBOOST HEALTH & RUL PREDICTION
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-bold shadow-[0_0_8px_rgba(16,185,129,0.2)]">
          AI ENGINE ONLINE
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Health Score */}
        <div className="p-3.5 rounded-xl bg-[#131C2B] border border-slate-800/80 flex flex-col justify-between h-28 shadow-sm">
          <span className="text-[11px] text-slate-400 font-medium">PROPULSION HEALTH</span>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-mono font-bold ${
              healthPercent > 80 ? 'text-emerald-400' : healthPercent > 60 ? 'text-orange-400' : 'text-red-400'
            }`}>
              {healthScore.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-500">/ 1.00</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                healthPercent > 80 ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]' : healthPercent > 60 ? 'bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]' : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]'
              }`}
              style={{ width: `${healthPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Status: <span className="text-slate-100 font-bold uppercase">{healthStatus}</span></span>
        </div>

        {/* Predicted RUL */}
        <div className="p-3.5 rounded-xl bg-[#131C2B] border border-slate-800/80 flex flex-col justify-between h-28 shadow-sm">
          <span className="text-[11px] text-slate-400 font-medium">PREDICTED RUL (HOURS)</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-bold text-slate-100">
              {estimatedRulHours}
            </span>
            <span className="text-xs font-mono text-slate-400 font-bold">HRS</span>
          </div>
          <span className="text-xs text-slate-300 font-medium">
            Est. ~{Math.floor(estimatedRulHours / 4.5)} Sorties Remaining
          </span>
          <span className="text-[10px] text-slate-500 font-medium">MTBF baseline adjusted</span>
        </div>

        {/* KNN Fault Classifier */}
        <div className="p-3.5 rounded-xl bg-[#131C2B] border border-slate-800/80 flex flex-col justify-between h-28 shadow-sm">
          <span className="text-[11px] text-slate-400 font-medium">KNN FAULT CLASSIFIER</span>
          <div className="flex items-center gap-1.5 my-auto">
            {(predictedFault === 'nominal' || predictedFault === 'normal') ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertOctagon className="w-4 h-4 text-red-400 animate-pulse" />
            )}
            <span className={`text-xs font-bold uppercase ${
              (predictedFault === 'nominal' || predictedFault === 'normal') ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {(predictedFault === 'nominal' || predictedFault === 'normal') ? 'NOMINAL' : predictedFault.replace(/_/g, ' ')}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Confidence: <span className="text-slate-100 font-bold">{(faultConfidence * 100).toFixed(0)}%</span>
          </span>
        </div>
      </div>
    </div>
  );
}
