import React from 'react';
import { useDigitalTwinStore } from '../../store/useDigitalTwinStore';
import { BatteryCharging, Zap } from 'lucide-react';
import batteryModuleImg from '../../assets/battery_module.jpg';

export function BatteryModuleCard() {
  const { telemetry, datasetIndex, datasetTotalRows } = useDigitalTwinStore();

  const batteryVoltage = Number(telemetry?.batteryVoltage || 26.0).toFixed(2);
  const current = Number(telemetry?.alternatorCurrent || 22.0).toFixed(1);
  const temp = (Number(telemetry?.ambientTemperatureC || 28) + 4.2).toFixed(1);
  const batteryPct = Math.max(18, Math.round(92 - ((datasetIndex || 0) / (datasetTotalRows || 120)) * 14));
  const isLoaded = Number(batteryVoltage) < 25.8;

  return (
    <div className="flex-1 bg-[#0F1420]/85 backdrop-blur-xl border border-slate-700/60 p-4 rounded-2xl shadow-2xl flex flex-col gap-3 relative select-none">
      {/* Header */}
      <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
        <BatteryCharging className="w-4 h-4 text-emerald-400" />
        <span>BATTERY MODULE</span>
      </div>

      {/* Content Grid (3 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center flex-1">
        {/* Sub-Column 1: Big Percentage & 2x2 Telemetry Grid (4 cols) */}
        <div className="md:col-span-4 flex flex-col justify-between h-full gap-2">
          <div>
            <div className="text-3xl font-display font-extrabold text-[#4ADE80] tracking-tight drop-shadow-[0_0_12px_rgba(74,222,128,0.5)]">
              {batteryPct} <span className="text-xl font-bold">%</span>
            </div>
            <span className="text-[10px] font-sans font-medium text-slate-400 uppercase tracking-wider">
              BATTERY LEVEL
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1 text-xs font-mono">
            <div>
              <span className="text-[9px] text-slate-400 font-sans block">CURRENT</span>
              <span className="text-slate-100 font-bold">{current} <span className="text-[10px] text-slate-400 font-normal">A</span></span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 font-sans block">VOLTAGE</span>
              <span className="text-slate-100 font-bold">{batteryVoltage} <span className="text-[10px] text-slate-400 font-normal">V</span></span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 font-sans block">CYCLES</span>
              <span className="text-slate-100 font-bold">212</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 font-sans block">TEMP.</span>
              <span className="text-slate-100 font-bold">{temp} <span className="text-[10px] text-slate-400 font-normal">°C</span></span>
            </div>
          </div>
        </div>

        {/* Sub-Column 2: 3D Holographic Battery Render (4 cols) */}
        <div className="md:col-span-4 flex flex-col items-center justify-center gap-1 bg-[#090D15]/80 p-2 rounded-xl border border-slate-800">
          <div className="w-20 h-20 rounded-lg overflow-hidden flex items-center justify-center filter drop-shadow-[0_0_12px_rgba(34,197,94,0.35)]">
            <img
              src={batteryModuleImg}
              alt="Battery Module 3D"
              className="w-full h-full object-contain filter brightness-110"
            />
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-xs font-mono font-bold text-emerald-400 tracking-wide">
              DF-BT-01
            </span>
            <span className="text-[9px] font-sans font-medium text-slate-400 uppercase">
              BATTERY SYSTEM
            </span>
          </div>
        </div>

        {/* Sub-Column 3: Remaining Endurance & Status List (4 cols) */}
        <div className="md:col-span-4 flex flex-col justify-between h-full gap-2 text-xs font-mono">
          {/* Top: Remaining Endurance & Mini Sparkline */}
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <div>
              <span className="text-[9px] text-slate-400 font-sans block">REMAINING ENDURANCE</span>
              <span className="text-sm font-bold text-slate-100">4h 12m</span>
            </div>
            <div className="w-16 h-5">
              <svg className="w-full h-full" viewBox="0 0 48 16">
                <path
                  d="M0,12 Q12,14 24,6 T48,4"
                  fill="none"
                  stroke="#4ADE80"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="filter drop-shadow-[0_0_3px_rgba(74,222,128,0.8)]"
                />
              </svg>
            </div>
          </div>

          {/* Telemetry List */}
          <div className="flex flex-col gap-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans text-[10px]">ENERGY REMAINING</span>
              <span className="text-slate-200 font-bold">{(3.8 * (batteryPct / 100)).toFixed(2)} <span className="text-[9px] text-slate-400 font-normal">kWh</span></span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans text-[10px]">POWER DRAW</span>
              <span className="text-slate-200 font-bold">{((Number(current) * Number(batteryVoltage)) / 1000).toFixed(2)} <span className="text-[9px] text-slate-400 font-normal">kW</span></span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans text-[10px]">ETA (RETURN)</span>
              <span className="text-slate-200 font-bold">00 : 18 : 45</span>
            </div>

            <div className="flex justify-between items-center pt-0.5">
              <span className="text-slate-400 font-sans text-[10px]">BUS STATUS</span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                isLoaded 
                  ? 'bg-amber-950/80 border border-amber-500/40 text-amber-300' 
                  : 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-400'
              }`}>
                {isLoaded ? 'HEAVY LOAD' : 'NOMINAL'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
