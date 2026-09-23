import React from 'react';
import { useDigitalTwinStore } from '../../store/useDigitalTwinStore';
import { 
  Plane, 
  Flame, 
  Droplet, 
  Disc, 
  Zap, 
  Radio, 
  Check, 
  AlertTriangle 
} from 'lucide-react';

export function SubsystemHealthTree() {
  const { telemetry, diagnostics, targetSubsystem, setTargetSubsystem } = useDigitalTwinStore();

  const isChtHigh = (telemetry?.cht1 > 190) || (telemetry?.cht2 > 190);
  const isOilLow = telemetry?.oilPressurePsi < 35;
  const isEgtImbalance = Math.abs(telemetry?.egt1 - telemetry?.egt2) > 50;

  const subsystems = [
    {
      id: 'airframe',
      name: 'AIRFRAME & AEROELASTIC',
      status: 'NOMINAL',
      detail: '0.08g Wing Stress • 110 KTAS',
      health: 98,
      icon: Plane,
      color: 'emerald',
    },
    {
      id: 'cylinders',
      name: 'PROPULSION & CYLINDERS',
      status: isChtHigh ? 'CRITICAL' : 'HEALTHY',
      detail: `CHT ${telemetry?.cht1?.toFixed(0)}°C / ${telemetry?.cht2?.toFixed(0)}°C • ${Math.round(telemetry?.rpm || 4850)} RPM`,
      health: isChtHigh ? 45 : 94,
      icon: Flame,
      color: isChtHigh ? 'crimson' : 'emerald',
    },
    {
      id: 'injection',
      name: 'FUEL INJECTION & RAILS',
      status: isEgtImbalance ? 'WARN (ASYM)' : 'NOMINAL',
      detail: `${telemetry?.fuelFlowLph?.toFixed(1) || 19.4} L/h • ΔEGT ${Math.abs(telemetry?.egt1 - telemetry?.egt2).toFixed(0)}°C`,
      health: isEgtImbalance ? 65 : 96,
      icon: Droplet,
      color: isEgtImbalance ? 'amber' : 'emerald',
    },
    {
      id: 'lubrication',
      name: 'LUBRICATION CIRCUIT',
      status: isOilLow ? 'LOW PRESS' : 'OPTIMAL',
      detail: `${telemetry?.oilPressurePsi?.toFixed(1) || 54.2} PSI • ${telemetry?.oilTemperatureC?.toFixed(0) || 86}°C`,
      health: isOilLow ? 38 : 95,
      icon: Disc,
      color: isOilLow ? 'crimson' : 'emerald',
    },
    {
      id: 'avionics',
      name: 'FADEC & 28V DC BUS',
      status: 'SYNCHRONIZED',
      detail: `${telemetry?.batteryVoltage?.toFixed(1) || 28.2}V • ${telemetry?.alternatorCurrent?.toFixed(1) || 32.5}A`,
      health: 99,
      icon: Zap,
      color: 'cyan',
    },
  ];

  return (
    <div className="hud-card p-4 rounded-lg border border-slate-800 flex flex-col gap-3 relative overflow-hidden">
      <div className="hud-bracket-tl" />
      <div className="hud-bracket-tr" />
      <div className="hud-bracket-bl" />
      <div className="hud-bracket-br" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-tactical font-bold tracking-wider text-slate-300">
          SUBSYSTEM DIAGNOSTICS TREE
        </span>
        <span className="text-[10px] font-mono text-cyan-400">
          5 / 5 ONLINE
        </span>
      </div>

      {/* Subsystem List */}
      <div className="flex flex-col gap-2">
        {subsystems.map((sub) => {
          const Icon = sub.icon;
          const isSelected = targetSubsystem === sub.id;
          const isCrimson = sub.color === 'crimson';
          const isAmber = sub.color === 'amber';

          return (
            <div
              key={sub.id}
              onClick={() => setTargetSubsystem(sub.id)}
              className={`p-2 rounded border cursor-pointer transition-all duration-150 flex flex-col gap-1.5 ${
                isSelected
                  ? 'bg-cyan-950/40 border-cyan-500/70 shadow-sm ring-1 ring-cyan-500/40'
                  : 'bg-[#070A10]/70 border-slate-800/80 hover:border-slate-700 hover:bg-[#0B101B]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded ${
                    isCrimson
                      ? 'bg-red-500/20 text-red-400'
                      : isAmber
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-cyan-500/20 text-cyan-400'
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-tactical font-semibold text-slate-200">
                    {sub.name}
                  </span>
                </div>

                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  isCrimson
                    ? 'bg-red-950 border border-red-500/50 text-red-400 animate-pulse'
                    : isAmber
                    ? 'bg-amber-950 border border-amber-500/50 text-amber-400'
                    : 'bg-emerald-950 border border-emerald-500/40 text-emerald-400'
                }`}>
                  {sub.status}
                </span>
              </div>

              {/* Progress Bar & Detail */}
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>{sub.detail}</span>
                <span className={isCrimson ? 'text-red-400 font-bold' : 'text-slate-300'}>
                  {sub.health}%
                </span>
              </div>

              <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isCrimson
                      ? 'bg-red-500'
                      : isAmber
                      ? 'bg-amber-500'
                      : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                  }`}
                  style={{ width: `${sub.health}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
