import React from 'react';
import { useDigitalTwinStore } from '../../store/useDigitalTwinStore';
import { Gauge, Flame, Activity, Zap, Droplet, Battery, ShieldAlert } from 'lucide-react';

export function PrimaryEngineGauges() {
  const { telemetry, diagnostics } = useDigitalTwinStore();

  const rpm = telemetry?.rpm || 5210;
  const cht1 = telemetry?.cht1 || 218.4;
  const cht2 = telemetry?.cht2 || 221.2;
  const meanCht = telemetry?.meanCht || ((cht1 + cht2) / 2);
  const egt1 = telemetry?.egt1 || 524.5;
  const egt2 = telemetry?.egt2 || 531.0;
  const meanEgt = telemetry?.meanEgt || ((egt1 + egt2) / 2);
  const oilPress = telemetry?.oilPressurePsi || 60.9;
  const oilTemp = telemetry?.oilTemperatureC || 86.8;
  const fuelFlow = telemetry?.fuelFlowLph || 28.4;
  const mapInHg = telemetry?.manifoldPressureInHg || 30.2;
  const vib = telemetry?.vibrationMean || 2.05;
  const batVolt = telemetry?.batteryVoltage || 26.0;
  const altCurr = telemetry?.alternatorCurrent || 22.0;
  const injTiming = telemetry?.injectionTimingBtdc || 20.5;

  const isChtCritical = meanCht > 250;
  const isOilCritical = oilPress < 42 || oilTemp > 120;
  const isVibCritical = vib > 4.5;

  return (
    <div className="p-4 rounded-2xl bg-[#0a0f15]/90 backdrop-blur-xl border border-slate-800 shadow-2xl flex flex-col gap-3.5 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-100 tracking-wide uppercase font-mono">
            AERO-PISTON TELEMETRY BUS (FADEC DUAL-CHANNEL A/B)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-bold uppercase ${
            (diagnostics?.predictedFault === 'normal' || diagnostics?.predictedFault === 'nominal')
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400'
              : 'bg-red-950/80 border-red-500/80 text-red-300 animate-pulse'
          }`}>
            {(diagnostics?.predictedFault === 'normal' || diagnostics?.predictedFault === 'nominal') ? 'CAN-BUS: NOMINAL' : `FAULT: ${diagnostics?.predictedFault.replace(/_/g, ' ')}`}
          </span>
        </div>
      </div>

      {/* Gauges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Tachometer (RPM) */}
        <div className="p-3 rounded-xl bg-[#0f1724] border border-slate-800 flex flex-col justify-between h-28 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>ENGINE SPEED</span>
            <span className="text-xs text-slate-500 font-mono">6000 MAX</span>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl font-mono font-black text-white">
              {Math.round(rpm).toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-slate-400">RPM</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${
                rpm > 5600 ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]' : rpm > 5300 ? 'bg-orange-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, (rpm / 6000) * 100)}%` }}
            />
          </div>
        </div>

        {/* 2. Cylinder Head Temp (CHT) */}
        <div className={`p-3 rounded-xl border flex flex-col justify-between h-28 shadow-sm transition-all ${
          isChtCritical ? 'bg-red-950/40 border-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.2)]' : 'bg-[#0f1724] border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <Flame className={`w-3 h-3 ${isChtCritical ? 'text-red-400 animate-pulse' : 'text-orange-400'}`} />
              CYL HEAD (CHT)
            </span>
            <span className="text-xs text-slate-500 font-mono">300° MAX</span>
          </div>
          <div className="flex items-baseline justify-between text-xs font-mono font-bold my-1">
            <div>C1: <span className={cht1 > 240 ? 'text-red-400 font-black' : 'text-slate-100'}>{cht1.toFixed(1)}°</span></div>
            <div>C2: <span className={cht2 > 240 ? 'text-red-400 font-black' : 'text-slate-100'}>{cht2.toFixed(1)}°</span></div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden flex gap-0.5">
            <div
              className={`h-full ${cht1 > 240 ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(50, (cht1 / 300) * 50)}%` }}
            />
            <div
              className={`h-full ${cht2 > 240 ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(50, (cht2 / 300) * 50)}%` }}
            />
          </div>
        </div>

        {/* 3. Exhaust Gas Temp (EGT) */}
        <div className="p-3 rounded-xl bg-[#0f1724] border border-slate-800 flex flex-col justify-between h-28 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>EXHAUST (EGT)</span>
            <span className="text-xs text-slate-500 font-mono">750° MAX</span>
          </div>
          <div className="flex items-baseline justify-between text-xs font-mono font-bold my-1">
            <div className="text-orange-300">E1: <span>{egt1.toFixed(0)}°C</span></div>
            <div className="text-orange-300">E2: <span>{egt2.toFixed(0)}°C</span></div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden flex gap-0.5">
            <div
              className={`h-full ${egt1 > 580 ? 'bg-red-500' : 'bg-orange-500'}`}
              style={{ width: `${Math.min(50, (egt1 / 750) * 50)}%` }}
            />
            <div
              className={`h-full ${egt2 > 580 ? 'bg-red-500' : 'bg-orange-500'}`}
              style={{ width: `${Math.min(50, (egt2 / 750) * 50)}%` }}
            />
          </div>
        </div>

        {/* 4. Oil Circuit (Pressure & Temperature) */}
        <div className={`p-3 rounded-xl border flex flex-col justify-between h-28 shadow-sm transition-all ${
          isOilCritical ? 'bg-red-950/40 border-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.2)]' : 'bg-[#0f1724] border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <Droplet className={`w-3 h-3 ${isOilCritical ? 'text-red-400' : 'text-cyan-400'}`} />
              OIL CIRCUIT
            </span>
            <span className="text-xs text-slate-500 font-mono">PSI / °C</span>
          </div>
          <div className="flex items-baseline justify-between text-xs font-mono font-bold my-1">
            <div className={oilPress < 42 ? 'text-red-400 font-black' : 'text-emerald-400'}>{oilPress.toFixed(1)} PSI</div>
            <div className={oilTemp > 110 ? 'text-red-400 font-black' : 'text-slate-300'}>{oilTemp.toFixed(1)}°C</div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full ${oilPress < 42 ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, (oilPress / 80) * 100)}%` }}
            />
          </div>
        </div>

        {/* 5. Vibration RMS */}
        <div className={`p-3 rounded-xl border flex flex-col justify-between h-28 shadow-sm transition-all ${
          isVibCritical ? 'bg-red-950/40 border-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.2)] animate-pulse' : 'bg-[#0f1724] border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <Activity className={`w-3 h-3 ${isVibCritical ? 'text-red-400' : 'text-emerald-400'}`} />
              3-AXIS VIBRATION
            </span>
            <span className="text-xs text-slate-500 font-mono">8.0g MAX</span>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className={`text-2xl font-mono font-black ${isVibCritical ? 'text-red-400' : 'text-white'}`}>
              {vib.toFixed(2)}
            </span>
            <span className="text-[10px] font-mono text-slate-400">g-RMS</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full ${vib > 4.5 ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]' : vib > 2.5 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, (vib / 8.0) * 100)}%` }}
            />
          </div>
        </div>

        {/* 6. Electrical & Ignition */}
        <div className="p-3 rounded-xl bg-[#0f1724] border border-slate-800 flex flex-col justify-between h-28 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-400" />
              ELECTRICAL / INJ
            </span>
            <span className="text-xs text-slate-500 font-mono">28V DC</span>
          </div>
          <div className="flex flex-col gap-0.5 text-xs font-mono my-0.5">
            <div className="flex justify-between">
              <span className="text-slate-400">BATTERY:</span>
              <span className="text-white font-bold">{batVolt.toFixed(2)} V</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">ALT / INJ:</span>
              <span className="text-slate-200 font-bold">{altCurr.toFixed(1)}A / {injTiming.toFixed(1)}°</span>
            </div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${Math.min(100, (batVolt / 30) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
