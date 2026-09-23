import React, { useEffect } from 'react';
import { useDigitalTwinStore } from './store/useDigitalTwinStore';
import { TacticalHeader } from './components/layout/TacticalHeader';
import { MasterWarningBanner } from './components/layout/MasterWarningBanner';
import { PlatformOverviewCard } from './components/diagnostics/PlatformOverviewCard';
import { MissionStatusRibbon } from './components/diagnostics/MissionStatusRibbon';
import { ActiveFaultAlertFeed } from './components/diagnostics/ActiveFaultAlertFeed';
import { DroneDigitalTwinScene } from './components/3d/DroneDigitalTwinScene';
import { ElectricMotorOverviewCard } from './components/tactical/ElectricMotorOverviewCard';
import { BatteryModuleCard } from './components/tactical/BatteryModuleCard';
import { PrimaryEngineGauges } from './components/telemetry/PrimaryEngineGauges';
import { PhysicsResidualCard } from './components/telemetry/PhysicsResidualCard';
import { SpectrumOscilloscope } from './components/telemetry/SpectrumOscilloscope';
import { HealthIndexAndRul } from './components/ai/HealthIndexAndRul';
import { ShapWaterfallChart } from './components/ai/ShapWaterfallChart';
import { MaintenanceAdvisory } from './components/ai/MaintenanceAdvisory';
import { MissionReplayTimeline } from './components/replay/MissionReplayTimeline';
import { OperatorFaultInjector } from './components/faultInjection/OperatorFaultInjector';
import { MissionHealthDossier } from './components/dossier/MissionHealthDossier';
import { audioAlertService } from './services/audioAlertService';

export function App() {
  const { activeView, tick, telemetry, diagnostics } = useDigitalTwinStore();

  // Unlock / prime Web Audio Context on first user interaction (click, keypress, touch)
  useEffect(() => {
    const handleFirstInteraction = () => {
      audioAlertService.ensureContext();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  // 10Hz Telemetry Ticker (100ms interval for smooth rendering)
  useEffect(() => {
    const timer = setInterval(() => {
      tick(0.1);
    }, 100);
    return () => clearInterval(timer);
  }, [tick]);

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col font-sans bg-gcs-map">
      {/* ── Top Tactical Navigation Header ────────────────────── */}
      <TacticalHeader />

      {/* ── High-Priority Aerospace Master Warning HUD Banner ──── */}
      <MasterWarningBanner />

      {/* ── Main Viewport Content ─────────────────────────────── */}
      <main className="flex-1 p-4 md:p-5 max-w-[1920px] w-full mx-auto flex flex-col gap-4">
        {/* ── 1. Tactical Digital Twin (Main GCS View) ─────────── */}
        {activeView === 'tactical-twin' && (
          <div className="flex flex-col gap-4 flex-1">
            {/* Top 3D WebGL Digital Twin Scene */}
            <div className="w-full h-[520px] lg:h-[560px] rounded-2xl overflow-hidden shadow-2xl relative">
              <DroneDigitalTwinScene />
            </div>

            {/* Primary Live Gauges (Telemetry Bus) */}
            <PrimaryEngineGauges />

            {/* Tactical Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-6 flex flex-col gap-4">
                <ElectricMotorOverviewCard />
              </div>
              <div className="lg:col-span-6 flex flex-col gap-4">
                <BatteryModuleCard />
              </div>
            </div>

            {/* Additional Telemetry & Alerts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-6">
                <PhysicsResidualCard />
              </div>
              <div className="lg:col-span-6">
                <ActiveFaultAlertFeed />
              </div>
            </div>
          </div>
        )}

        {/* ── 2. Propulsion AI & Predictive Diagnostics ───────── */}
        {activeView === 'ai-analytics' && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-6 flex flex-col gap-4">
                <HealthIndexAndRul />
                <ShapWaterfallChart />
                <MaintenanceAdvisory />
              </div>
              <div className="lg:col-span-6 flex flex-col gap-4">
                <PhysicsResidualCard />
                <MissionStatusRibbon />
              </div>
            </div>
            <PrimaryEngineGauges />
            <SpectrumOscilloscope />
          </div>
        )}

        {/* ── 3. Mission Simulation & Replay Lab ────────────────── */}
        {activeView === 'mission-lab' && (
          <div className="flex flex-col gap-4">
            <MissionReplayTimeline />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[500px]">
              <div className="lg:col-span-8 min-h-[480px]">
                <DroneDigitalTwinScene />
              </div>
              <div className="lg:col-span-4 flex flex-col gap-4">
                <PlatformOverviewCard />
                <HealthIndexAndRul />
                <PhysicsResidualCard />
              </div>
            </div>
            <PrimaryEngineGauges />
            <SpectrumOscilloscope />
          </div>
        )}

        {/* ── 4. Operator Fault Injection Matrix ────────────────── */}
        {activeView === 'fault-matrix' && (
          <div className="flex flex-col gap-4">
            <OperatorFaultInjector />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-6 flex flex-col gap-4">
                <HealthIndexAndRul />
                <PhysicsResidualCard />
                <MaintenanceAdvisory />
              </div>
              <div className="lg:col-span-6 min-h-[400px]">
                <DroneDigitalTwinScene />
              </div>
            </div>
            <PrimaryEngineGauges />
          </div>
        )}

        {/* ── 5. Mission Health Dossier & Reliability Audit ─────── */}
        {activeView === 'dossier' && (
          <div className="flex flex-col gap-4">
            <MissionHealthDossier />
            <PrimaryEngineGauges />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <HealthIndexAndRul />
              <MaintenanceAdvisory />
            </div>
          </div>
        )}
      </main>

      {/* ── Bottom GCS Status Bar ─────────────────────────────── */}
      <footer className="w-full bg-[#0B101B] border-t border-slate-800 px-5 py-2.5 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 gap-3 select-none shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-slate-200 font-medium">FADEC DUAL-CHANNEL A/B: <span className="text-emerald-400 font-bold">ONLINE</span></span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-slate-500">
            <span>CAN-BUS: 1 Mbps</span>
            <span>•</span>
            <span>SAMPLE: 20 Hz</span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div>
            OAT: <span className="text-slate-200 font-bold">{(telemetry?.ambientTemperatureC || 28.0).toFixed(1)}°C</span>
          </div>
          <div>
            ALTITUDE: <span className="text-slate-200 font-bold">{Math.round(telemetry?.altitude || 4000)} m</span>
          </div>
          <div>
            AIR DENSITY: <span className="text-slate-200 font-bold">{(telemetry?.airDensityKgm3 || 0.863).toFixed(3)} kg/m³</span>
          </div>
          <div className="hidden md:block">
            SECURITY: <span className="text-emerald-400 font-bold">AES-256 GCM ENCRYPTED</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
