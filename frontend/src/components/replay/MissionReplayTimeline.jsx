import React from 'react';
import { useDigitalTwinStore } from '../../store/useDigitalTwinStore';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Database,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Cpu,
  Flame,
  Gauge,
  Zap,
  Table,
  FileSpreadsheet,
  Layers
} from 'lucide-react';

export function MissionReplayTimeline() {
  const { 
    missionReplay, 
    togglePlayPause, 
    setReplaySpeed, 
    datasetMode,
    setDatasetMode,
    datasetIndex,
    datasetTotalRows,
    setDatasetIndex,
    telemetry,
    diagnostics,
  } = useDigitalTwinStore();

  const { isPlaying, speed, currentMissionTimeSec } = missionReplay;

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isFaulty = datasetMode === 'faulty';
  const progressPercent = Math.min(100, Math.max(0, ((datasetIndex + 1) / (datasetTotalRows || 120)) * 100));

  // Determine current active anomaly phase in faulty dataset
  let activePhaseLabel = "100% NOMINAL FLIGHT CRUISE";
  let activePhaseColor = "text-emerald-400 bg-emerald-950/80 border-emerald-500/50";
  if (isFaulty) {
    if (datasetIndex < 51) {
      activePhaseLabel = "PHASE 1: NOMINAL BASELINE (ROWS 1–51)";
      activePhaseColor = "text-emerald-400 bg-emerald-950/80 border-emerald-500/50";
    } else if (datasetIndex < 71) {
      activePhaseLabel = "PHASE 2: OVERHEATING + INJECTOR ABNORMALITY (ROWS 52–71)";
      activePhaseColor = "text-amber-400 bg-amber-950/80 border-amber-500/50 animate-pulse";
    } else {
      activePhaseLabel = "PHASE 3: COMPOUND CRITICAL FAILURE (ROWS 72–120)";
      activePhaseColor = "text-red-400 bg-red-950/80 border-red-500/50 animate-pulse";
    }
  }

  const raw = telemetry.rawRow || {};

  return (
    <div className="flex flex-col gap-4 bg-[#0a0f0d]/95 backdrop-blur-md border border-[#1b3a28]/70 rounded-xl p-5 text-slate-100 shadow-2xl">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b3a28]/60 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-wider uppercase text-white font-mono">
                MISSION SIMULATION & TELEMETRY LAB
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
                DATASET REPLAY ENGINE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Live continuous CSV stream: <span className="font-mono text-emerald-300">{isFaulty ? 'faulty_engine_continuous_dataset.csv' : 'normal_engine_continuous_dataset.csv'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 font-mono text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111f17] border border-[#1b3a28]">
            <span className="text-slate-400 text-[11px]">CLOCK:</span>
            <span className="text-emerald-400 font-bold">{formatTime(currentMissionTimeSec)}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111f17] border border-[#1b3a28]">
            <span className="text-slate-400 text-[11px]">ROW:</span>
            <span className="text-white font-bold">{datasetIndex + 1} / {datasetTotalRows || 120}</span>
          </div>
        </div>
      </div>

      {/* ── THE SINGLE MASTER DATASET TOGGLE SWITCH ─────────────── */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#0a1610] via-[#0f2117] to-[#0a1610] border-2 border-[#205338] shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-wider text-white uppercase font-mono flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-emerald-400" />
              MASTER TELEMETRY DATA STREAM TOGGLE
            </span>
            <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${activePhaseColor}`}>
              {activePhaseLabel}
            </span>
          </div>
          <p className="text-xs text-slate-300">
            {isFaulty
              ? 'Currently streaming FAULTY telemetry with progressive thermal, oil pressure, injector and vibration anomalies.'
              : 'Currently streaming NORMAL nominal cruise flight telemetry across all sensors and propulsion subsystems.'}
          </p>
        </div>

        {/* The Master Action Toggle Button */}
        <button
          onClick={() => setDatasetMode(isFaulty ? 'normal' : 'faulty')}
          className={`px-5 py-3 rounded-xl border-2 font-mono font-black text-xs tracking-wider uppercase transition-all duration-300 flex items-center gap-3 shadow-lg ${
            isFaulty
              ? 'bg-red-950/90 hover:bg-red-900 border-red-500 text-red-100 shadow-[0_0_25px_rgba(239,68,68,0.4)] ring-2 ring-red-500/50 animate-pulse'
              : 'bg-emerald-950/90 hover:bg-emerald-900 border-emerald-400 text-emerald-100 shadow-[0_0_25px_rgba(16,185,129,0.35)] ring-2 ring-emerald-400/50'
          }`}
        >
          {isFaulty ? (
            <>
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span>ACTIVE: FAULTY DATA (CLICK FOR NORMAL)</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>ACTIVE: NORMAL DATA (CLICK FOR FAULTY)</span>
            </>
          )}
        </button>
      </div>

      {/* ── TIMELINE SCRUBBER & ANOMALY SEGMENTS ────────────────── */}
      <div className="flex flex-col gap-2.5 p-4 rounded-xl bg-[#0e1813] border border-[#1b3a28]">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-300 font-bold flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            TIMELINE SCRUBBER (ROW {datasetIndex + 1} OF {datasetTotalRows || 120})
          </span>
          <span className="text-emerald-400 font-bold">
            PROGRESS: {progressPercent.toFixed(1)}% | CSV TIME: {telemetry.csvTimestamp || '10:00:00'}
          </span>
        </div>

        {/* Phase Badges / Segment Map */}
        {isFaulty ? (
          <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono font-bold text-center">
            <div className={`p-1.5 rounded border transition-all ${datasetIndex < 51 ? 'bg-emerald-900/90 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400' : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400/60'}`}>
              ROWS 01–51: NOMINAL
            </div>
            <div className={`p-1.5 rounded border transition-all ${datasetIndex >= 51 && datasetIndex < 71 ? 'bg-amber-900/90 border-amber-400 text-amber-200 ring-1 ring-amber-400 animate-pulse' : 'bg-amber-950/40 border-amber-800/40 text-amber-400/60'}`}>
              ROWS 52–71: OVERHEAT + INJECTOR
            </div>
            <div className={`p-1.5 rounded border transition-all ${datasetIndex >= 71 ? 'bg-red-900/90 border-red-400 text-red-200 ring-1 ring-red-400 animate-pulse' : 'bg-red-950/40 border-red-800/40 text-red-400/60'}`}>
              ROWS 72–120: COMPOUND CRITICAL
            </div>
          </div>
        ) : (
          <div className="w-full p-1.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-center text-xs font-mono font-bold text-emerald-300">
            ROWS 01–120: 100% NOMINAL STEADY-STATE CRUISE FLIGHT TELEMETRY
          </div>
        )}

        {/* Interactive Slider */}
        <input
          type="range"
          min="0"
          max={(datasetTotalRows || 120) - 1}
          value={datasetIndex}
          onChange={(e) => setDatasetIndex(Number(e.target.value))}
          className="w-full accent-emerald-400 cursor-pointer h-2.5 bg-[#1b3a28] rounded-lg"
        />

        {/* Replay Controls & Speed Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlayPause}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-mono flex items-center gap-2 transition-all shadow-md ${
                isPlaying
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30'
                  : 'bg-emerald-500 text-slate-950 font-black hover:bg-emerald-400'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'PAUSE STREAM' : 'RUN STREAM'}
            </button>

            <button
              onClick={() => setDatasetIndex(0)}
              className="p-2 rounded-lg bg-[#16261d] text-slate-300 border border-[#234d35] hover:text-white hover:bg-[#1d3527] transition-all"
              title="Reset to Row 1"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Speed Multipliers */}
            <div className="flex items-center gap-1 bg-[#111f17] p-1 rounded-lg border border-[#1b3a28] text-xs font-mono">
              {[0.5, 1, 2, 5, 10].map((s) => (
                <button
                  key={`spd-${s}`}
                  onClick={() => setReplaySpeed(s)}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    speed === s
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white hover:bg-emerald-950'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Key Sensor Readouts */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="flex items-center gap-1 bg-[#16261d] px-2.5 py-1 rounded-lg border border-[#234d35]">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-slate-400">CHT:</span>
              <span className={`font-bold ${telemetry.cht > 240 ? 'text-red-400' : 'text-white'}`}>{telemetry.cht || telemetry.cht1}°C</span>
            </div>
            <div className="flex items-center gap-1 bg-[#16261d] px-2.5 py-1 rounded-lg border border-[#234d35]">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">OIL:</span>
              <span className={`font-bold ${telemetry.oilPressurePsi < 45 ? 'text-red-400' : 'text-white'}`}>{telemetry.oilPressurePsi} PSI</span>
            </div>
            <div className="flex items-center gap-1 bg-[#16261d] px-2.5 py-1 rounded-lg border border-[#234d35]">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">VIB:</span>
              <span className={`font-bold ${telemetry.vibrationMean > 4.0 ? 'text-red-400' : 'text-white'}`}>{telemetry.vibrationMean}g</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── LIVE CSV RAW TELEMETRY INSPECTOR (LINE-BY-LINE TRANSPARENCY) ── */}
      <div className="p-4 rounded-xl bg-[#080d0b] border border-[#1b3a28] flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-[#1b3a28]/60 pb-2">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold font-mono text-white tracking-wider uppercase">
              LIVE CSV ROW TELEMETRY INSPECTOR (RAW FILE VALUES)
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Source: <span className="text-emerald-300 font-bold">{isFaulty ? 'faulty_engine_continuous_dataset.csv' : 'normal_engine_continuous_dataset.csv'}</span> [Row {datasetIndex + 1}]
          </span>
        </div>

        {/* 16-Column Raw Telemetry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 text-xs font-mono">
          <div className="p-2 rounded-lg bg-[#111f17] border border-[#1b3a28]">
            <span className="text-[10px] text-slate-400 block">TIMESTAMP</span>
            <span className="text-emerald-300 font-bold truncate block">{raw.timestamp || telemetry.csvTimestamp || '10:00:00'}</span>
          </div>
          <div className="p-2 rounded-lg bg-[#111f17] border border-[#1b3a28]">
            <span className="text-[10px] text-slate-400 block">RPM</span>
            <span className="text-white font-bold">{Number(raw.rpm || telemetry.rpm).toFixed(1)}</span>
          </div>
          <div className="p-2 rounded-lg bg-[#111f17] border border-[#1b3a28]">
            <span className="text-[10px] text-slate-400 block">THROTTLE</span>
            <span className="text-white font-bold">{Number(raw.throttle || telemetry.throttle).toFixed(1)}%</span>
          </div>
          <div className="p-2 rounded-lg bg-[#111f17] border border-[#1b3a28]">
            <span className="text-[10px] text-slate-400 block">ALTITUDE</span>
            <span className="text-white font-bold">{Number(raw.altitude || telemetry.altitude).toFixed(0)}m</span>
          </div>
          <div className="p-2 rounded-lg bg-[#111f17] border border-[#1b3a28]">
            <span className="text-[10px] text-slate-400 block">AMB TEMP</span>
            <span className="text-white font-bold">{Number(raw.ambient_temperature || telemetry.ambientTemperatureC).toFixed(1)}°C</span>
          </div>
          <div className={`p-2 rounded-lg border ${Number(raw.cht || telemetry.cht) > 240 ? 'bg-red-950/70 border-red-500 text-red-300' : 'bg-[#111f17] border-[#1b3a28] text-white'}`}>
            <span className="text-[10px] text-slate-400 block">CHT</span>
            <span className="font-bold">{Number(raw.cht || telemetry.cht).toFixed(1)}°C</span>
          </div>
          <div className={`p-2 rounded-lg border ${Number(raw.egt || telemetry.egt) > 570 ? 'bg-red-950/70 border-red-500 text-red-300' : 'bg-[#111f17] border-[#1b3a28] text-white'}`}>
            <span className="text-[10px] text-slate-400 block">EGT</span>
            <span className="font-bold">{Number(raw.egt || telemetry.egt).toFixed(1)}°C</span>
          </div>
          <div className={`p-2 rounded-lg border ${Number(raw.oil_pressure || telemetry.oilPressurePsi) < 45 ? 'bg-red-950/70 border-red-500 text-red-300' : 'bg-[#111f17] border-[#1b3a28] text-white'}`}>
            <span className="text-[10px] text-slate-400 block">OIL PRESS</span>
            <span className="font-bold">{Number(raw.oil_pressure || telemetry.oilPressurePsi).toFixed(1)} PSI</span>
          </div>

          <div className={`p-2 rounded-lg border ${Number(raw.oil_temperature || telemetry.oilTemperatureC) > 110 ? 'bg-red-950/70 border-red-500 text-red-300' : 'bg-[#111f17] border-[#1b3a28] text-white'}`}>
            <span className="text-[10px] text-slate-400 block">OIL TEMP</span>
            <span className="font-bold">{Number(raw.oil_temperature || telemetry.oilTemperatureC).toFixed(1)}°C</span>
          </div>
          <div className="p-2 rounded-lg bg-[#111f17] border border-[#1b3a28]">
            <span className="text-[10px] text-slate-400 block">FUEL FLOW</span>
            <span className="text-white font-bold">{Number(raw.fuel_flow || telemetry.fuelFlowLph).toFixed(1)} L/h</span>
          </div>
          <div className={`p-2 rounded-lg border ${Number(raw.vibration || telemetry.vibrationMean) > 4.0 ? 'bg-red-950/70 border-red-500 text-red-300' : 'bg-[#111f17] border-[#1b3a28] text-white'}`}>
            <span className="text-[10px] text-slate-400 block">VIBRATION</span>
            <span className="font-bold">{Number(raw.vibration || telemetry.vibrationMean).toFixed(2)}g</span>
          </div>
          <div className="p-2 rounded-lg bg-[#111f17] border border-[#1b3a28]">
            <span className="text-[10px] text-slate-400 block">BATTERY</span>
            <span className="text-white font-bold">{Number(raw.battery_voltage || telemetry.batteryVoltage).toFixed(2)}V</span>
          </div>
          <div className="p-2 rounded-lg bg-[#111f17] border border-[#1b3a28]">
            <span className="text-[10px] text-slate-400 block">ALT CURRENT</span>
            <span className="text-white font-bold">{Number(raw.alternator_current || telemetry.alternatorCurrent).toFixed(1)}A</span>
          </div>
          <div className="p-2 rounded-lg bg-[#111f17] border border-[#1b3a28]">
            <span className="text-[10px] text-slate-400 block">INJ TIMING</span>
            <span className="text-white font-bold">{Number(raw.injection_timing || telemetry.injectionTimingBtdc).toFixed(1)}°</span>
          </div>
          <div className="p-2 rounded-lg bg-[#111f17] border border-[#1b3a28] col-span-2">
            <span className="text-[10px] text-slate-400 block">CSV FAULT TYPE</span>
            <span className={`font-bold truncate block ${raw.fault_type === 'normal' ? 'text-emerald-400' : 'text-red-400'}`}>
              {raw.fault_type || telemetry.groundTruthFault || 'normal'}
            </span>
          </div>
        </div>
      </div>

      {/* ── AI EVALUATION & PREDICTIVE METRICS CARD ─────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl bg-[#0c1611] border border-[#1b3a28]">
        {/* Col 1: Ground Truth vs Predicted */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            GROUND TRUTH VS AI PREDICTION
          </span>
          <div className="flex flex-col gap-1 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">CSV Label:</span>
              <span className={`font-bold px-2 py-0.5 rounded ${
                (raw.fault_type || 'normal') === 'normal'
                  ? 'bg-emerald-950 text-emerald-300'
                  : 'bg-red-950 text-red-300'
              }`}>
                {raw.fault_type || telemetry.groundTruthFault || 'normal'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">KNN AI Model:</span>
              <span className={`font-bold px-2 py-0.5 rounded ${
                (diagnostics.predictedFault === 'normal' || diagnostics.predictedFault === 'nominal')
                  ? 'bg-emerald-950 text-emerald-300'
                  : 'bg-red-950 text-red-300'
              }`}>
                {(diagnostics.predictedFault === 'normal' || diagnostics.predictedFault === 'nominal') ? 'NOMINAL' : diagnostics.predictedFault.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Col 2: Health Index & RUL */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            XGBOOST HEALTH INDEX & RUL
          </span>
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-slate-400">Health Score:</span>
            <span className={`text-base font-black ${
              diagnostics.healthPercent >= 75 ? 'text-emerald-400' :
              diagnostics.healthPercent >= 50 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {diagnostics.healthPercent}% ({diagnostics.healthStatus})
            </span>
          </div>
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-slate-400">Estimated RUL:</span>
            <span className="text-white font-bold">{diagnostics.estimatedRulHours} hrs ({Math.round(diagnostics.estimatedRulSeconds)}s)</span>
          </div>
          <div className="w-full bg-[#1b3a28] rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                diagnostics.healthPercent >= 75 ? 'bg-emerald-400' :
                diagnostics.healthPercent >= 50 ? 'bg-amber-400' : 'bg-red-500'
              }`}
              style={{ width: `${diagnostics.healthPercent}%` }}
            />
          </div>
        </div>

        {/* Col 3: SHAP Feature Attributions */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            TOP SHAP FEATURE IMPACTS
          </span>
          <div className="flex flex-col gap-1 text-[11px] font-mono">
            {(diagnostics.topShapAttributions || []).slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-[#111f17] px-2 py-0.5 rounded border border-[#1b3a28]">
                <span className="text-slate-300 truncate max-w-[130px]">{item.label || item.feature}</span>
                <span className={`font-bold ${item.impact < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {item.impact < 0 ? '' : '+'}{item.impactPercent}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
