import React from 'react';
import { Html } from '@react-three/drei';
import { useDigitalTwinStore } from '../../store/useDigitalTwinStore';
import { Flame, Activity, Zap, Droplet, Disc, AlertTriangle } from 'lucide-react';

export function HotspotCallouts({ viewTarget, telemetry }) {
  const { targetSubsystem, setTargetSubsystem, diagnostics } = useDigitalTwinStore();

  const isEngineView = viewTarget === 'engine';

  const hotspots = isEngineView ? [
    {
      id: 'cylinders',
      name: 'CYL-1 HEAD (CHT)',
      pos: [-1.4, 0.2, 0.2],
      val: `${telemetry?.cht1?.toFixed(1) || 168.4}°C`,
      status: telemetry?.cht1 > 190 ? 'critical' : 'nominal',
      icon: Flame,
    },
    {
      id: 'cylinders',
      name: 'CYL-2 HEAD (CHT)',
      pos: [1.4, -0.2, 0.2],
      val: `${telemetry?.cht2?.toFixed(1) || 171.2}°C`,
      status: telemetry?.cht2 > 190 ? 'critical' : 'nominal',
      icon: Flame,
    },
    {
      id: 'injection',
      name: 'EFI FUEL RAIL',
      pos: [0, 0.7, 0.8],
      val: `${telemetry?.fuelFlowLph?.toFixed(1) || 19.4} L/h`,
      status: 'nominal',
      icon: Droplet,
    },
    {
      id: 'lubrication',
      name: 'OIL SUMP & PUMP',
      pos: [0, 0, -1.1],
      val: `${telemetry?.oilPressurePsi?.toFixed(1) || 54.2} PSI`,
      status: telemetry?.oilPressurePsi < 35 ? 'critical' : 'nominal',
      icon: Disc,
    },
    {
      id: 'avionics',
      name: '28V DC BUS / GEN',
      pos: [0, -1.1, 0.4],
      val: `${telemetry?.batteryVoltage?.toFixed(1) || 28.2} V`,
      status: 'nominal',
      icon: Zap,
    }
  ] : [
    {
      id: 'airframe',
      name: 'VENTRAL EO/IR POD',
      pos: [0, 2.2, -0.6],
      val: 'ONLINE (HD/IR)',
      status: 'nominal',
      icon: Activity,
    },
    {
      id: 'engine-bay',
      name: 'PROPULSION NACELLE',
      pos: [0, -2.2, 0.4],
      val: `${telemetry?.rpm ? Math.round(telemetry.rpm) : 4850} RPM`,
      status: diagnostics?.healthStatus === 'Critical' ? 'critical' : 'nominal',
      icon: Flame,
    },
    {
      id: 'avionics',
      name: 'FADEC & CAN-BUS',
      pos: [0, 0.6, 0.6],
      val: 'AES-256 LINK',
      status: 'nominal',
      icon: Zap,
    }
  ];

  return (
    <group>
      {hotspots.map((hs, idx) => {
        const isSelected = targetSubsystem === hs.id;
        const isCritical = hs.status === 'critical';
        const Icon = hs.icon;

        return (
          <group key={`hotspot-${idx}`} position={hs.pos}>
            {/* 3D Anchor */}
            <mesh>
              <sphereGeometry args={[0.06, 12, 12]} />
              <meshBasicMaterial
                color={isCritical ? '#DC2626' : isSelected ? '#16A34A' : '#059669'}
              />
            </mesh>

            {/* Tactical Dark HTML Callout Card */}
            <Html distanceFactor={10} position={[0, 0.15, 0]} center>
              <div
                onClick={() => setTargetSubsystem(hs.id)}
                className={`cursor-pointer px-2.5 py-1.5 rounded-xl border transition-all duration-200 select-none flex items-center gap-2 whitespace-nowrap backdrop-blur-md shadow-xl ${
                  isSelected
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_16px_rgba(16,185,129,0.5)] ring-2 ring-emerald-400'
                    : isCritical
                    ? 'bg-red-950/90 border-red-500 text-red-200 shadow-[0_0_16px_rgba(239,68,68,0.5)] animate-pulse'
                    : 'bg-[#0B101B]/95 border-slate-700/80 text-slate-100 hover:border-emerald-400 hover:bg-slate-800'
                }`}
              >
                <div className={`p-1 rounded-lg ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : isCritical
                    ? 'bg-red-900/70 text-red-300'
                    : 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className={`text-[9px] font-bold tracking-wider ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                    {hs.name}
                  </span>
                  <span className={`text-xs font-mono font-bold ${
                    isSelected ? 'text-white' : isCritical ? 'text-red-400' : 'text-slate-100'
                  }`}>
                    {hs.val}
                  </span>
                </div>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
