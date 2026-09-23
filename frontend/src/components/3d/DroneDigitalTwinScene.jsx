import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei';
import { MALEUAVAirframe } from './MALEUAVAirframe';
import { AeroPistonEngine3D } from './AeroPistonEngine3D';
import { HotspotCallouts } from './HotspotCallouts';
import { TelemetryBandwidthWidget } from '../tactical/TelemetryBandwidthWidget';
import { LinkSecurityWidget } from '../tactical/LinkSecurityWidget';
import { useDigitalTwinStore } from '../../store/useDigitalTwinStore';
import { 
  Layers, 
  Flame, 
  Activity, 
  Eye, 
  Maximize2, 
  Plane, 
  Cpu 
} from 'lucide-react';

export function DroneDigitalTwinScene() {
  const { 
    viewportMode, 
    setViewportMode, 
    targetSubsystem, 
    setTargetSubsystem,
    telemetry 
  } = useDigitalTwinStore();

  const [modelType, setModelType] = useState('airframe'); // 'airframe' | 'engine'

  const modes = [
    { id: '3d-view', label: '3D VIEW', icon: Eye },
    { id: 'system-health', label: 'SYSTEM', icon: Layers },
    { id: 'thermal-gradient', label: 'THERMAL', icon: Flame },
    { id: 'vibration', label: 'HARMONICS', icon: Activity },
    { id: 'xray', label: 'X-RAY', icon: Maximize2 },
  ];

  return (
    <div className="relative w-full h-full min-h-[520px] bg-[#060910] overflow-hidden rounded-2xl border border-slate-800 shadow-2xl flex flex-col select-none">
      {/* ── Top Floating HUD Overlays ────────────────────────────── */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-start justify-between gap-4 pointer-events-none">
        {/* Left: Platform Bracket Callout (Direct in 3D Scene as seen in image) */}
        <div className="pointer-events-auto bg-[#0F1420]/85 backdrop-blur-xl border border-slate-700/60 p-3 rounded-2xl shadow-2xl flex flex-col">
          <div className="relative pl-3 border-l-2 border-emerald-400 py-0.5">
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-2xl tracking-wider text-[#4ADE80] drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]">
                DF-OPS-241
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-bold">
                ONLINE
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono tracking-widest uppercase block">
              FIXED-WING PLATFORM
            </span>
          </div>

          {/* Model Toggle & Shader toolbar */}
          <div className="flex items-center gap-1.5 pt-2 mt-2 border-t border-slate-700/60">
            <button
              onClick={() => { setModelType('airframe'); setTargetSubsystem('all'); }}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                modelType === 'airframe'
                  ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <Plane className="w-3 h-3" />
              AIRFRAME
            </button>
            <button
              onClick={() => { setModelType('engine'); setTargetSubsystem('all'); }}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                modelType === 'engine'
                  ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <Cpu className="w-3 h-3" />
              ENGINE
            </button>
          </div>
        </div>

        {/* Right: Telemetry Bandwidth & Link Security Widgets (From Reference Image) */}
        <div className="pointer-events-auto flex flex-col sm:flex-row items-end sm:items-center gap-3">
          <TelemetryBandwidthWidget />
          <LinkSecurityWidget />
        </div>
      </div>

      {/* ── Center Tactical Vector HUD Callout Overlays ───────── */}
      <div className="absolute inset-0 pointer-events-none z-[5]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {/* Callout 1: Motor / Propeller to Bottom Left */}
          <g opacity="0.85">
            {/* Target Reticle at Propeller */}
            <circle cx="28%" cy="56%" r="22" fill="none" stroke="#4ADE80" strokeWidth="1" strokeDasharray="3 2" className="filter drop-shadow-[0_0_4px_rgba(74,222,128,0.8)]" />
            <circle cx="28%" cy="56%" r="3" fill="#4ADE80" />
            
            {/* Bracket Vector Line */}
            <path
              d="M 28% 56% L 20% 56% L 20% 70% L 15% 70%"
              fill="none"
              stroke="#4ADE80"
              strokeWidth="1.5"
              className="filter drop-shadow-[0_0_4px_rgba(74,222,128,0.8)]"
            />
            {/* Arrowhead */}
            <polygon points="0,0 -4,8 4,8" fill="#4ADE80" transform="translate(15%, 70%) rotate(90)" />
          </g>

          {/* Callout 2: Battery Dorsal Bay to Bottom Right */}
          <g opacity="0.85">
            {/* Target Reticle at Battery Bay */}
            <rect x="58%" y="30%" width="52" height="28" rx="4" fill="none" stroke="#4ADE80" strokeWidth="1" strokeDasharray="3 2" className="filter drop-shadow-[0_0_4px_rgba(74,222,128,0.8)]" />
            
            {/* Bracket Vector Line */}
            <path
              d="M 64% 44% L 64% 60% L 68% 60% L 68% 70%"
              fill="none"
              stroke="#4ADE80"
              strokeWidth="1.5"
              className="filter drop-shadow-[0_0_4px_rgba(74,222,128,0.8)]"
            />
            {/* Arrowhead */}
            <polygon points="0,0 -4,8 4,8" fill="#4ADE80" transform="translate(68%, 70%) rotate(180)" />
          </g>
        </svg>
      </div>

      {/* ── 3D Canvas Viewport (Cinematic Wet Runway Tarmac) ── */}
      <div className="w-full h-full cursor-grab active:cursor-grabbing flex-1">
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={modelType === 'airframe' ? [-3.2, 2.2, 4.6] : [0, 2.5, 4.0]} fov={38} />
          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            minDistance={1.8}
            maxDistance={12.0}
            maxPolarAngle={Math.PI / 2 + 0.05}
          />

          {/* Cinematic Studio Lighting with Highlights */}
          <ambientLight intensity={0.8} />
          <directionalLight
            position={[10, 16, 10]}
            intensity={2.4}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <directionalLight position={[-10, 8, -6]} intensity={1.2} color="#60A5FA" />
          <pointLight position={[0, -1, 2]} intensity={1.6} color="#4ADE80" />

          {/* Render 3D Model */}
          <Suspense fallback={null}>
            {modelType === 'airframe' ? (
              <MALEUAVAirframe
                viewportMode={viewportMode}
                telemetry={telemetry}
                isSelected={targetSubsystem === 'airframe'}
              />
            ) : (
              <AeroPistonEngine3D
                viewportMode={viewportMode}
                telemetry={telemetry}
                isFocused={targetSubsystem !== 'all'}
              />
            )}

            {/* Hotspot Markers only when in system mode */}
            {viewportMode === 'system-health' && (
              <HotspotCallouts viewTarget={modelType} telemetry={telemetry} />
            )}
          </Suspense>
        </Canvas>
      </div>

      {/* ── Bottom Floating Toolbar: Viewport Modes ─────────────── */}
      <div className="absolute bottom-3 left-4 right-4 z-10 pointer-events-none flex items-center justify-between">
        <div className="bg-[#0F1420]/85 backdrop-blur-xl px-3.5 py-1.5 rounded-xl border border-slate-700/60 text-xs text-slate-300 pointer-events-auto flex items-center gap-3 shadow-lg">
          <div>
            <span className="text-slate-400 font-medium">Platform:</span>{' '}
            <span className="text-slate-100 font-bold uppercase">DRDO TAPAS-BH-201 (DF-OPS-241)</span>
          </div>
          <div className="h-3 w-px bg-slate-700" />
          <div>
            <span className="text-slate-400 font-medium">Propulsion:</span>{' '}
            <span className="text-emerald-400 font-bold">ELECTRIC MOTOR & TURBOCHARGED HYBRID</span>
          </div>
        </div>

        {/* Viewport Shader Modes */}
        <div className="flex items-center gap-1 pointer-events-auto bg-[#0F1420]/85 backdrop-blur-xl p-1 rounded-xl border border-slate-700/60 shadow-lg">
          {modes.map((m) => {
            const Icon = m.icon;
            const isActive = viewportMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setViewportMode(m.id)}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                }`}
              >
                <Icon className="w-3 h-3" />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

