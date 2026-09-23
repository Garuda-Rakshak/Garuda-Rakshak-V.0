import React from 'react';
import { useDigitalTwinStore } from '../../store/useDigitalTwinStore';
import { BarChart3 } from 'lucide-react';

export function ShapWaterfallChart() {
  const { diagnostics } = useDigitalTwinStore();
  const { topShapAttributions } = diagnostics;

  return (
    <div className="gcs-panel p-4 flex flex-col gap-3.5 bg-[#0D1420] border border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-100 tracking-wide uppercase">
            EXPLAINABLE AI // SHAP FEATURE IMPACT (TOP 5)
          </span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
          TreeExplainer (XGBoost)
        </span>
      </div>

      <p className="text-xs text-slate-400 font-medium">
        Quantifies the individual positive or negative contribution of sensor variables toward the engine health prediction.
      </p>

      {/* SHAP Bars */}
      <div className="flex flex-col gap-2.5 pt-1">
        {topShapAttributions && topShapAttributions.map((item, idx) => {
          const isNegative = item.impact < 0;
          const absImpact = Math.min(100, Math.abs(item.impact) * 200);

          return (
            <div key={`shap-${idx}`} className="flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-200 font-semibold">
                  {item.feature}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px] font-mono">{item.rawVal}</span>
                  <span className={`font-mono font-bold ${isNegative ? 'text-red-400' : 'text-emerald-400'}`}>
                    {item.impact > 0 ? `+${item.impactPercent}` : `${item.impactPercent}`}
                  </span>
                </div>
              </div>

              {/* Dual Direction Impact Bar */}
              <div className="w-full bg-slate-800 rounded-full h-2.5 relative flex items-center overflow-hidden border border-slate-700/50">
                <div className="w-1/2 h-full border-r border-slate-700 flex justify-end">
                  {isNegative && (
                    <div
                      className="h-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)] transition-all duration-300 rounded-l"
                      style={{ width: `${absImpact}%` }}
                    />
                  )}
                </div>
                <div className="w-1/2 h-full flex justify-start">
                  {!isNegative && (
                    <div
                      className="h-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)] transition-all duration-300 rounded-r"
                      style={{ width: `${absImpact}%` }}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800 font-medium">
        <span>← Health Penalty (Degradation)</span>
        <span>Health Contribution (Nominal) →</span>
      </div>
    </div>
  );
}
