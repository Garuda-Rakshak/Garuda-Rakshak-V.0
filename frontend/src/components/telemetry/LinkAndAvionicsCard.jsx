import React from 'react';
import { useDigitalTwinStore } from '../../store/useDigitalTwinStore';
import { 
  ShieldCheck, 
  Wifi, 
  BatteryCharging, 
  Navigation, 
  Fuel, 
  Zap, 
  Radio 
} from 'lucide-react';

export function LinkAndAvionicsCard() {
  const { telemetry } = useDigitalTwinStore();

  const fuelRem = telemetry?.fuelRemainingLiters || 142.5;
  const fuelBurnLph = telemetry?.fuelFlowLph || 19.4;
  const enduranceHours = fuelBurnLph > 0 ? fuelRem / fuelBurnLph : 7.2;
  const rtbRadiusKm = Math.round(enduranceHours * (telemetry?.airspeedKts || 110) * 1.852 * 0.45);

  return (
    <div className="hud-card p-4 rounded-lg border border-slate-800 flex flex-col gap-3 relative overflow-hidden">
      <div className="hud-bracket-tl" />
      <div className="hud-bracket-tr" />
      <div className="hud-bracket-bl" />
      <div className="hud-bracket-br" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-tactical font-bold tracking-wider text-slate-300">
            SECURE DATALINK & MISSION ENDURANCE
          </span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          ENCRYPTED
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Link Bandwidth */}
        <div className="p-2.5 rounded bg-[#070A10]/80 border border-slate-800 flex flex-col gap-1">
          <span className="text-[10px] font-tactical text-slate-400">TELEMETRY BANDWIDTH</span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-mono font-bold text-cyan-300">14.8</span>
            <span className="text-[10px] font-mono text-slate-400">Mbps DL</span>
          </div>
          <span className="text-[9px] font-mono text-emerald-400">99.4% Link Quality</span>
        </div>

        {/* 28V DC Electrical Bus */}
        <div className="p-2.5 rounded bg-[#070A10]/80 border border-slate-800 flex flex-col gap-1">
          <span className="text-[10px] font-tactical text-slate-400">28V DC AVIONICS BUS</span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-mono font-bold text-slate-100">
              {(telemetry?.batteryVoltage || 28.2).toFixed(1)}
            </span>
            <span className="text-[10px] font-mono text-slate-400">V DC</span>
          </div>
          <span className="text-[9px] font-mono text-cyan-400">
            {(telemetry?.alternatorCurrent || 32.5).toFixed(1)} A Alternator
          </span>
        </div>

        {/* Fuel & Endurance */}
        <div className="p-2.5 rounded bg-[#070A10]/80 border border-slate-800 flex flex-col gap-1">
          <span className="text-[10px] font-tactical text-slate-400">MISSION ENDURANCE</span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-mono font-bold text-amber-300">
              {Math.floor(enduranceHours)}h {Math.round((enduranceHours % 1) * 60)}m
            </span>
          </div>
          <span className="text-[9px] font-mono text-slate-400">
            {fuelRem.toFixed(1)} L Remaining
          </span>
        </div>

        {/* RTB Safe Radius */}
        <div className="p-2.5 rounded bg-[#070A10]/80 border border-slate-800 flex flex-col gap-1">
          <span className="text-[10px] font-tactical text-slate-400">SAFE RTB RADIUS</span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-mono font-bold text-emerald-400">
              {rtbRadiusKm}
            </span>
            <span className="text-[10px] font-mono text-slate-400">km</span>
          </div>
          <span className="text-[9px] font-mono text-slate-400">
            Leh Base Within Reach
          </span>
        </div>
      </div>
    </div>
  );
}
