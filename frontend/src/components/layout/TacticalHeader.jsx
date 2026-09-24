import React, { useState, useEffect } from 'react';
import { useDigitalTwinStore } from '../../store/useDigitalTwinStore';
import { 
  ShieldCheck, 
  Radio, 
  Clock, 
  MapPin, 
  Activity, 
  Cpu, 
  RotateCcw, 
  SlidersHorizontal, 
  FileText, 
  Volume2, 
  VolumeX, 
  AlertCircle,
  Server,
  Wifi
} from 'lucide-react';

export function TacticalHeader() {
  const { 
    activeView, 
    setActiveView, 
    isSoundEnabled, 
    toggleSound,
    masterAlarm,
    silenceAlarm
  } = useDigitalTwinStore();

  const [zuluTime, setZuluTime] = useState('');
  const [backendStatus, setBackendStatus] = useState('checking'); // 'connected' | 'offline' | 'checking'

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = now.getUTCHours().toString().padStart(2, '0');
      const m = now.getUTCMinutes().toString().padStart(2, '0');
      const s = now.getUTCSeconds().toString().padStart(2, '0');
      setZuluTime(`${h}:${m}:${s} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch('/health');
        if (res.ok) {
          setBackendStatus('connected');
        } else {
          setBackendStatus('offline');
        }
      } catch (e) {
        setBackendStatus('offline');
      }
    };
    checkBackend();
    const timer = setInterval(checkBackend, 4000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 'tactical-twin', label: 'DIGITAL TWIN', icon: Activity },
    { id: 'ai-analytics', label: 'PROPULSION AI', icon: Cpu },
    { id: 'mission-lab', label: 'SIMULATION LAB', icon: RotateCcw },
    { id: 'fault-matrix', label: 'FAULT INJECTION', icon: SlidersHorizontal },
    { id: 'dossier', label: 'HEALTH DOSSIER', icon: FileText },
  ];

  return (
    <header className="w-full bg-[#0B101B]/95 backdrop-blur-md border-b border-slate-800 px-5 py-3 flex flex-col md:flex-row items-center justify-between gap-4 select-none shadow-md">
      {/* ── Left: Platform Bracket Callout (Exact Design from Reference) ── */}
      <div className="flex items-center gap-3.5">
        <div className="relative pl-3 border-l-2 border-emerald-400 py-0.5">
          <div className="flex items-center gap-2">
            <span className="font-display font-black text-xl tracking-wider text-[#4ADE80] drop-shadow-[0_0_10px_rgba(74,222,128,0.4)]">
              DF-OPS-241
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-bold">
              GARUDA-RAKSHAK
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono tracking-widest uppercase block">
            FIXED-WING PLATFORM // TAPAS-BH-201
          </span>
        </div>
      </div>

      {/* ── Center: Primary Navigation Dock ────────────────────── */}
      <nav className="flex items-center gap-1.5 p-1 rounded-xl bg-[#070B12] border border-slate-800 shadow-inner">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-[0_0_14px_rgba(16,185,129,0.4)]'
                  : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* ── Right: Mission Clock & Sound Controls ──────────────── */}
      <div className="flex items-center gap-3">
        {masterAlarm.active && (
          <button
            onClick={silenceAlarm}
            title="Click to Silence Alarm"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold shadow-[0_0_12px_rgba(220,38,38,0.6)] animate-pulse"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>ALARM RINGING</span>
          </button>
        )}

        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#131C2B] border border-slate-800 text-xs font-semibold text-slate-300">
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          <span>34.1526° N, 77.5771° E</span>
        </div>

        {/* Backend API Status Indicator */}
        <div 
          title={backendStatus === 'connected' ? 'Backend API: Connected (Port 5000)' : 'Backend API: Offline (Using Browser Engine)'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${
            backendStatus === 'connected'
              ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
              : 'bg-amber-950/50 border-amber-500/40 text-amber-300'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${backendStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <Server className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {backendStatus === 'connected' ? 'API 5000' : 'OFFLINE'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs font-mono font-bold text-emerald-400 shadow-sm">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span>{zuluTime}</span>
        </div>

        <button
          onClick={toggleSound}
          title={isSoundEnabled ? 'Alarm Sound: Enabled (Click to mute)' : 'Alarm Sound: Muted (Click to enable)'}
          className={`p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-mono ${
            isSoundEnabled
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
              : 'bg-[#131C2B] border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          <span className="hidden sm:inline font-bold">
            {isSoundEnabled ? 'ALARM ON' : 'MUTED'}
          </span>
        </button>
      </div>
    </header>
  );
}


