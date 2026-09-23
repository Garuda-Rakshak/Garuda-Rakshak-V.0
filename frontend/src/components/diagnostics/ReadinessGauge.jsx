import React from 'react';
import { useDigitalTwinStore } from '../../store/useDigitalTwinStore';
import { Shield, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';

/**
 * Tactical Circular Segmented Readiness Meter (inspired by the Dribbble UAS reference).
 */
export function ReadinessGauge() {
  const { diagnostics, telemetry } = useDigitalTwinStore();
  const { healthScore, healthPercent, healthStatus, statusColor } = diagnostics;

  // Segment count = 20
  const totalSegments = 24;
  const activeSegments = Math.round((healthPercent / 100) * totalSegments);

  const getStatusBadge = () => {
    switch (healthStatus) {
      case 'Healthy':
        return {
          bg: 'bg-emerald-950/80',
          border: 'border-emerald-500/50',
          text: 'text-emerald-400',
          icon: CheckCircle2,
        };
      case 'Moderate':
        return {
          bg: 'bg-cyan-950/80',
          border: 'border-cyan-500/50',
          text: 'text-cyan-400',
          icon: Shield,
        };
      case 'Degraded':
        return {
          bg: 'bg-amber-950/80',
          border: 'border-amber-500/50',
          text: 'text-amber-400',
          icon: AlertTriangle,
        };
      default:
        return {
          bg: 'bg-red-950/80',
          border: 'border-red-500/50',
          text: 'text-red-400',
          icon: AlertOctagon,
        };
    }
  };

  const badge = getStatusBadge();
  const Icon = badge.icon;

  return (
    <div className="hud-card p-4 rounded-lg border border-slate-800 flex flex-col gap-3 relative overflow-hidden">
      <div className="hud-bracket-tl" />
      <div className="hud-bracket-tr" />
      <div className="hud-bracket-bl" />
      <div className="hud-bracket-br" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-tactical font-bold tracking-wider text-slate-300">
            SYSTEM READINESS
          </span>
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded border ${badge.bg} ${badge.border} ${badge.text} text-[10px] font-mono font-bold uppercase`}>
          <Icon className="w-3 h-3" />
          {healthStatus}
        </div>
      </div>

      {/* Circular Segmented Ring & Percentage */}
      <div className="flex items-center justify-center py-2 relative">
        <div className="relative w-36 h-36 flex items-center justify-center">
          {/* Circular SVG Segmented Gauge */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            {/* Background Track */}
            <circle
              cx="60"
              cy="60"
              r="48"
              fill="transparent"
              stroke="#1E293B"
              strokeWidth="8"
              strokeDasharray="4 3"
            />
            {/* Active Indicator Arc */}
            <circle
              cx="60"
              cy="60"
              r="48"
              fill="transparent"
              stroke={
                statusColor === 'emerald'
                  ? '#10B981'
                  : statusColor === 'cyan'
                  ? '#06B6D4'
                  : statusColor === 'amber'
                  ? '#F59E0B'
                  : '#EF4444'
              }
              strokeWidth="8"
              strokeDasharray="4 3"
              strokeDashoffset={301.59 * (1 - healthPercent / 100)}
              className="transition-all duration-300"
            />
          </svg>

          {/* Center Digital Readout */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-mono font-extrabold text-slate-100 tracking-tight">
              {healthPercent}%
            </span>
            <span className="text-[9px] font-tactical tracking-widest text-slate-400 uppercase">
              OPERATIONAL
            </span>
          </div>
        </div>
      </div>

      {/* Micro Status Indicators */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
        <div className="flex flex-col">
          <span className="text-[9px] font-tactical text-slate-400">FLIGHT TIME</span>
          <span className="font-bold text-slate-200">
            {Math.floor((telemetry?.flightTimeSeconds || 4820) / 3600)}h {Math.floor(((telemetry?.flightTimeSeconds || 4820) % 3600) / 60)}m
          </span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[9px] font-tactical text-slate-400">ENGINE HOURS</span>
          <span className="font-bold text-cyan-400">
            {(telemetry?.engineOperatingHours || 342.8).toFixed(1)} hrs
          </span>
        </div>
      </div>
    </div>
  );
}
