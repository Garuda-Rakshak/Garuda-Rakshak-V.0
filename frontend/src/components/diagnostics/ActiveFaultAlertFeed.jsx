import React from 'react';
import { useDigitalTwinStore } from '../../store/useDigitalTwinStore';
import { AlertOctagon, AlertTriangle, Info, CheckCircle, Trash2 } from 'lucide-react';

export function ActiveFaultAlertFeed() {
  const { alerts, clearAlerts, diagnostics } = useDigitalTwinStore();
  const { predictedFault, maintenanceDirective } = diagnostics;

  const isFaultActive = Boolean(predictedFault && predictedFault !== 'nominal' && predictedFault !== 'normal');

  return (
    <div className="hud-card p-4 rounded-lg border border-slate-800 flex flex-col gap-3 relative overflow-hidden">
      <div className="hud-bracket-tl" />
      <div className="hud-bracket-tr" />
      <div className="hud-bracket-bl" />
      <div className="hud-bracket-br" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-4 h-4 ${isFaultActive ? 'text-amber-400 animate-pulse' : 'text-cyan-400'}`} />
          <span className="text-xs font-tactical font-bold tracking-wider text-slate-300">
            ACTIVE FAULT & EVENT FEED
          </span>
        </div>
        {alerts.length > 0 && (
          <button
            onClick={clearAlerts}
            className="text-[10px] font-mono text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            CLEAR
          </button>
        )}
      </div>

      {/* Active Anomaly Banner if ML model detects issue */}
      {isFaultActive && (
        <div className="p-2.5 rounded bg-red-950/60 border border-red-500/60 shadow-hud-crimson flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-tactical font-bold text-red-300 flex items-center gap-1.5">
              <AlertOctagon className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              ANOMALY: {predictedFault.toUpperCase()}
            </span>
            <span className="text-[10px] font-mono bg-red-900/80 px-1.5 py-0.5 rounded text-red-200">
              CONF: {(diagnostics.faultConfidence * 100).toFixed(0)}%
            </span>
          </div>
          <p className="text-[10px] font-mono text-red-300/90 leading-tight">
            {maintenanceDirective.action}
          </p>
        </div>
      )}

      {/* Alert Stream List */}
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
        {alerts.length === 0 && !isFaultActive ? (
          <div className="p-4 text-center text-slate-500 text-xs font-mono">
            No active faults detected. Telemetry nominal.
          </div>
        ) : (
          alerts.map((alr) => {
            const isCrit = alr.severity === 'CRITICAL';
            const isWarn = alr.severity === 'WARNING';

            return (
              <div
                key={alr.id}
                className={`p-2 rounded border text-xs font-mono flex flex-col gap-1 transition-all ${
                  isCrit
                    ? 'bg-red-950/40 border-red-500/50 text-red-200'
                    : isWarn
                    ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                    : 'bg-[#070A10]/80 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-cyan-400">[{alr.id}] {alr.subsystem}</span>
                  <span className="text-slate-500">{alr.timestamp}</span>
                </div>
                <p className="text-[11px] text-slate-200 leading-snug">
                  {alr.message}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
