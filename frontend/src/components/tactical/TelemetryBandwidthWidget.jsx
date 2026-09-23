import React from 'react';
import { Network, ArrowDown, ArrowUp } from 'lucide-react';

export function TelemetryBandwidthWidget() {
  // Sparkline data points matching the graph in the reference image
  const points = [
    [0, 22], [8, 16], [16, 20], [24, 18], [32, 24], 
    [40, 21], [48, 26], [56, 22], [64, 14], [72, 12], 
    [80, 15], [88, 14], [96, 20], [104, 25], [112, 26]
  ];

  // Invert y for SVG coordinate system (height 40)
  const svgPoints = points.map(([x, y]) => `${x},${40 - y}`).join(' ');
  const areaPoints = `0,40 ${svgPoints} 112,40`;

  return (
    <div className="flex items-center gap-4 bg-[#0F1420]/85 backdrop-blur-xl border border-slate-700/60 p-3 rounded-2xl shadow-2xl select-none">
      {/* Chart Section */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 uppercase tracking-wider">
          <Network className="w-3.5 h-3.5 text-emerald-400" />
          <span>TELEMETRY BANDWIDTH</span>
        </div>

        <div className="flex items-end gap-2">
          <div className="relative w-28 h-10">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 112 40">
              <defs>
                <linearGradient id="bandwidthGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#22C55E" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Area Fill */}
              <polygon points={areaPoints} fill="url(#bandwidthGlow)" />
              {/* Line Stroke */}
              <polyline
                points={svgPoints}
                fill="none"
                stroke="#4ADE80"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="filter drop-shadow-[0_0_4px_rgba(74,222,128,0.7)]"
              />
            </svg>
          </div>

          <div className="flex justify-between text-[8px] font-mono text-slate-500 w-28 -mt-1">
            <span>14:00</span>
            <span>14:15</span>
            <span>14:30</span>
            <span>14:45</span>
          </div>
        </div>
      </div>

      {/* Vertical Divider */}
      <div className="h-10 w-px bg-slate-700/70" />

      {/* Downlink / Uplink Stats */}
      <div className="flex flex-col justify-center gap-1.5 text-xs font-mono">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] text-slate-400 font-sans font-medium flex items-center gap-1">
            <ArrowDown className="w-3 h-3 text-emerald-400" /> DOWNLINK
          </span>
          <span className="font-bold text-slate-100">3.1 <span className="text-[10px] text-slate-400 font-normal">Gbps</span></span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] text-slate-400 font-sans font-medium flex items-center gap-1">
            <ArrowUp className="w-3 h-3 text-slate-400" /> UPLINK
          </span>
          <span className="font-bold text-slate-200">1.1 <span className="text-[10px] text-slate-400 font-normal">Gbps</span></span>
        </div>
      </div>
    </div>
  );
}
