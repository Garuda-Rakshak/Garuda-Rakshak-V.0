import React from 'react';
import { useDigitalTwinStore } from '../../store/useDigitalTwinStore';
import { Cpu, Zap } from 'lucide-react';
import engineCutawayImg from '../../assets/engine_cutaway.jpg';

export function ElectricMotorOverviewCard() {
  const { telemetry, diagnostics } = useDigitalTwinStore();

  const rpm = telemetry?.rpm || 5210;
  const throttle = telemetry?.throttle || 57;
  const powerKw = ((rpm / 5000) * (throttle / 100) * 24.5).toFixed(1);
  const isCritical = (diagnostics?.predictedFault && diagnostics?.predictedFault !== 'normal' && diagnostics?.predictedFault !== 'nominal');
  const efficiency = diagnostics?.healthPercent ? Math.max(25, Math.min(96, Math.round(diagnostics.healthPercent * 0.95 + 5))) : 92;

  // Spectrum Heatmap Bars derived from active CHT & oil temperature
  const chtFactor = Math.min(1.0, Math.max(0, ((telemetry?.cht || 220) - 180) / 100)); // 0..1
  const oilFactor = Math.min(1.0, Math.max(0, ((telemetry?.oilTemperatureC || 85) - 70) / 90)); // 0..1
  const combinedFactor = (chtFactor * 0.6 + oilFactor * 0.4);

  const baseHeights = [
    22, 26, 32, 40, 48, 55, 62, 70, 78, 86, 92, 96, 98, 92, 
    85, 76, 68, 58, 48, 42, 38, 35, 42, 50, 46, 38, 32, 28
  ];

  const barHeights = baseHeights.map(h => {
    const boosted = h * (0.6 + combinedFactor * 0.8);
    return Math.min(100, Math.max(15, Math.round(boosted)));
  });

  const getBarColor = (val) => {
    if (val > 82) return '#EF4444'; // Red peak
    if (val > 70) return '#F97316'; // Orange
    if (val > 50) return '#EAB308'; // Yellow
    if (val > 35) return '#84CC16'; // Light lime
    return '#22C55E'; // Emerald green
  };

  return (
    <div className="flex-1 bg-[#0F1420]/85 backdrop-blur-xl border border-slate-700/60 p-4 rounded-2xl shadow-2xl flex flex-col gap-3 relative select-none">
      {/* Header */}
      <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
        <Cpu className="w-4 h-4 text-emerald-400" />
        <span>ELECTRIC MOTOR / PROPULSION OVERVIEW</span>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center flex-1">
        {/* Left Column: 3D Engine Thumbnail & Direct Output Readouts */}
        <div className="md:col-span-4 flex items-center gap-3 bg-[#090D15]/80 p-2.5 rounded-xl border border-slate-800">
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-black/80 flex items-center justify-center border border-slate-700/60 flex-shrink-0">
            <img
              src={engineCutawayImg}
              alt="Aero Engine Cutaway"
              className="w-full h-full object-cover filter brightness-110 contrast-125"
            />
          </div>

          <div className="flex flex-col gap-1 text-xs font-mono justify-center">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-sans font-medium">SPEED (RPM)</span>
              <span className="text-sm font-bold text-slate-100">{Math.round(rpm).toLocaleString()}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-sans font-medium">POWER OUTPUT</span>
              <span className="text-xs font-bold text-slate-200">{powerKw} kW</span>
            </div>
          </div>
        </div>

        {/* Right Column: Status, Efficiency & Spectrum Heatmap Bars */}
        <div className="md:col-span-8 flex flex-col gap-2.5">
          {/* Top Status & Efficiency row */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-slate-400">ENGINE STATUS</span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md uppercase ${
                isCritical
                  ? 'bg-red-950/80 border border-red-500/50 text-red-300 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                  : 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
              }`}>
                {isCritical ? (diagnostics?.predictedFault || 'ANOMALY') : 'NOMINAL'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium text-slate-400">EFFICIENCY</span>
              <span className="text-sm font-mono font-bold text-slate-100">{efficiency} <span className="text-xs text-slate-400">%</span></span>
            </div>
          </div>

          {/* Spectrum Bar Chart with Y-axis & X-axis */}
          <div className="flex items-end gap-2 pt-1">
            {/* Y-Axis scale */}
            <div className="flex flex-col justify-between text-[8px] font-mono text-slate-500 h-16 -mb-3 text-right">
              <span>100</span>
              <span>75</span>
              <span>50</span>
              <span>25</span>
              <span>0</span>
            </div>

            {/* Vertical Bars Container */}
            <div className="flex-1 flex flex-col gap-1">
              <div className="h-16 flex items-end justify-between gap-1 w-full bg-slate-900/40 p-1 rounded border border-slate-800/60">
                {barHeights.map((h, i) => (
                  <div
                    key={`bar-${i}`}
                    className="flex-1 rounded-t-sm transition-all duration-300"
                    style={{
                      height: `${h}%`,
                      backgroundColor: getBarColor(h),
                      boxShadow: `0 0 4px ${getBarColor(h)}66`,
                    }}
                  />
                ))}
              </div>

              {/* X-Axis time marks */}
              <div className="flex justify-between text-[8px] font-mono text-slate-500 px-0.5">
                <span>10:00</span>
                <span>10:05</span>
                <span>10:10</span>
                <span>10:15</span>
                <span>10:20</span>
                <span>10:25</span>
                <span>10:30</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
