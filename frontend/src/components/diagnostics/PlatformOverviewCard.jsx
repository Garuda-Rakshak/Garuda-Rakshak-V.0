import React from 'react';
import { useDigitalTwinStore } from '../../store/useDigitalTwinStore';
import { 
  Crosshair, 
  MapPin, 
  ArrowUpRight, 
  Gauge, 
  BatteryCharging, 
  Radio 
} from 'lucide-react';

export function PlatformOverviewCard() {
  const { telemetry } = useDigitalTwinStore();

  const alt = telemetry?.altitude || 3500;
  const speedKmh = Math.round((telemetry?.airspeedKts || 110) * 1.852);
  const batteryPct = Math.round(((telemetry?.fuelRemainingLiters || 142.5) / 180) * 100);

  return (
    <div className="gcs-panel p-4 flex flex-col gap-3.5 bg-[#0D1420] border border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-emerald-400" />
          <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
            SELECTED PLATFORM
          </span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 uppercase tracking-wider shadow-[0_0_8px_rgba(16,185,129,0.2)]">
          ON PATROL
        </span>
      </div>

      {/* Platform Title */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-slate-100 tracking-tight">TAPAS-BH-201</h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-950/80 border border-orange-500/40 text-orange-300 font-bold">
            DRDO / ADE
          </span>
        </div>
        <span className="text-xs text-slate-400 font-medium">Rustom-II MALE UAV — ISR Platform</span>
      </div>

      {/* Status Badges */}
      <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-[#070B12] border border-slate-800 shadow-inner">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400">Datalink Contact</span>
          <span className="text-slate-200 font-mono font-bold">02:40:12 UTC</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>STRONG (99.4%)</span>
        </div>
      </div>

      {/* Micro-Telemetry Rows */}
      <div className="flex flex-col gap-2">
        {/* Coordinates */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#131C2B] border border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-medium">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>SECTOR COORDS</span>
          </div>
          <span className="text-slate-200 font-mono font-semibold text-[11px]">
            34.1526° N, 77.5771° E
          </span>
        </div>

        {/* Altitude */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#131C2B] border border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>ALTITUDE (AMSL)</span>
          </div>
          <span className="text-slate-200 font-mono font-bold text-xs">
            {alt.toLocaleString()} m (High Alt)
          </span>
        </div>

        {/* Speed */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#131C2B] border border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-medium">
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            <span>TRUE AIRSPEED</span>
          </div>
          <span className="text-slate-200 font-mono font-bold text-xs">
            {speedKmh} km/h (110 KTAS)
          </span>
        </div>

        {/* Fuel Reserve */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#131C2B] border border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-medium">
            <BatteryCharging className="w-3.5 h-3.5 text-orange-400" />
            <span>AVGAS / FUEL</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-16 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/50">
              <div
                className="h-full bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.6)]"
                style={{ width: `${batteryPct}%` }}
              />
            </div>
            <span className="text-slate-200 font-mono font-bold text-xs">{batteryPct}%</span>
          </div>
        </div>

        {/* Signal Link */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#131C2B] border border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-medium">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>LOS / SATCOM LINK</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <div className="w-3 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <div className="w-3 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <div className="w-3 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
