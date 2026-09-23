import { create } from 'zustand';
import { engineSimulator } from '../services/enginePhysicsSimulator';
import { mlDiagnosticsService } from '../services/mlDiagnosticsService';
import { datasetLoader } from '../services/datasetLoader';
import { audioAlertService } from '../services/audioAlertService';

const initialDatasetMode = 'normal';
const initialRows = datasetLoader.getRows(initialDatasetMode);
const initialTelemetry = datasetLoader.mapCsvRowToTelemetry(initialRows[0] || {}, engineSimulator.state);
const initialDiagnostics = mlDiagnosticsService.evaluate(initialTelemetry);

export const useDigitalTwinStore = create((set, get) => ({
  // Navigation & Views
  activeView: 'tactical-twin', // 'tactical-twin' | 'ai-analytics' | 'mission-lab' | 'fault-matrix' | 'dossier'
  setActiveView: (view) => set({ activeView: view }),

  // 3D Viewport Configuration
  viewportMode: '3d-view', // '3d-view' | 'system-health' | 'thermal-gradient' | 'vibration' | 'xray'
  setViewportMode: (mode) => set({ viewportMode: mode }),

  targetSubsystem: 'all', // 'all' | 'airframe' | 'cylinders' | 'injection' | 'lubrication' | 'avionics'
  setTargetSubsystem: (subsystem) => set({ targetSubsystem: subsystem }),

  // Simple Alarm Sound System
  isSoundEnabled: true,
  masterAlarm: {
    active: false,
    message: '',
  },

  toggleSound: () => {
    const nextVal = !get().isSoundEnabled;
    audioAlertService.setMuted(!nextVal);
    set({ isSoundEnabled: nextVal });
  },

  silenceAlarm: () => {
    audioAlertService.stopAlarm();
    set({
      masterAlarm: {
        active: false,
        message: '',
      }
    });
  },

  // Continuous Telemetry Dataset Stream State
  datasetMode: 'normal', // 'normal' | 'faulty' | 'synthetic'
  datasetIndex: 0,
  datasetProgressFloat: 0.0,
  datasetTotalRows: initialRows.length,
  
  // Telemetry & Diagnostics
  telemetry: initialTelemetry,
  diagnostics: initialDiagnostics,
  
  // High-Frequency Time Series History (for Oscilloscopes and Graphs)
  history: {
    timestamps: [],
    rpm: [],
    cht1: [],
    cht2: [],
    egt1: [],
    egt2: [],
    expectedEgt: [],
    oilPressure: [],
    oilTemp: [],
    fuelFlow: [],
    vibration: [],
    healthHistory: [],
  },

  // Active Alerts Queue
  alerts: [
    {
      id: 'ALR-001',
      timestamp: '10:00:00 Z',
      subsystem: 'ML-FADEC',
      severity: 'NOMINAL',
      message: 'Continuous Telemetry Dataset Streaming Active (Normal Baseline)',
    },
    {
      id: 'ALR-002',
      timestamp: '10:00:01 Z',
      subsystem: 'SECURITY',
      severity: 'NOMINAL',
      message: 'AES-256 GCM Telemetry Uplink Synchronized @ 20Hz',
    }
  ],

  addAlert: (alert) => {
    const timestamp = new Date().toISOString().substring(11, 19) + ' Z';
    const newAlert = {
      id: `ALR-${Date.now().toString().slice(-4)}`,
      timestamp,
      ...alert
    };

    // If a major / critical error appears, trigger the loud alarm sound
    if (alert.severity === 'CRITICAL' && get().isSoundEnabled) {
      audioAlertService.playAlarm();
      set({
        masterAlarm: {
          active: true,
          message: alert.message,
        }
      });
    }

    set((state) => ({
      alerts: [newAlert, ...state.alerts.slice(0, 19)]
    }));
  },

  clearAlerts: () => {
    audioAlertService.stopAlarm();
    set({
      alerts: [],
      masterAlarm: {
        active: false,
        message: '',
      }
    });
  },

  // Dataset Mode Switcher (Normal vs Faulty CSV dataset toggle)
  setDatasetMode: (mode) => {
    const rows = datasetLoader.getRows(mode);
    const firstRow = rows[0] || {};
    const newTelemetry = datasetLoader.mapCsvRowToTelemetry(firstRow, get().telemetry);
    const newDiagnostics = mlDiagnosticsService.evaluate(newTelemetry);

    set({
      datasetMode: mode,
      datasetIndex: 0,
      datasetProgressFloat: 0.0,
      datasetTotalRows: rows.length,
      telemetry: newTelemetry,
      diagnostics: newDiagnostics,
    });

    if (mode === 'faulty') {
      get().addAlert({
        subsystem: 'TELEMETRY-STREAM',
        severity: 'WARNING',
        message: 'Active Dataset Switched to [FAULTY ENGINE TELEMETRY] (120 Rows Anomaly Injected)',
      });
    } else if (mode === 'normal') {
      get().silenceAlarm();
      get().addAlert({
        subsystem: 'TELEMETRY-STREAM',
        severity: 'NOMINAL',
        message: 'Active Dataset Switched to [NORMAL ENGINE TELEMETRY] (120 Rows Nominal Cruise)',
      });
    }
  },

  // Scrub directly to a specific row in the dataset
  setDatasetIndex: (idx) => {
    const rows = datasetLoader.getRows(get().datasetMode);
    const safeIdx = Math.max(0, Math.min(rows.length - 1, Math.floor(idx)));
    const targetRow = rows[safeIdx] || {};
    const newTelemetry = datasetLoader.mapCsvRowToTelemetry(targetRow, get().telemetry);
    const newDiagnostics = mlDiagnosticsService.evaluate(newTelemetry);

    set({
      datasetIndex: safeIdx,
      datasetProgressFloat: safeIdx,
      telemetry: newTelemetry,
      diagnostics: newDiagnostics,
    });
  },

  // Operator Fault Injection Matrix (Synthetic manual injection)
  faults: {
    injectorAbnormality: false,
    ignitionMisfire: false,
    lubricationLeak: false,
    coolingDegradation: false,
    abnormalVibration: false,
    sensorDrift: false,
  },

  toggleFault: (faultName) => {
    const current = get().faults[faultName];
    const updated = !current;
    engineSimulator.setFault(faultName, updated);
    
    set((state) => ({
      faults: { ...state.faults, [faultName]: updated }
    }));

    if (updated) {
      get().addAlert({
        subsystem: 'FAULT-INJECTION',
        severity: 'CRITICAL',
        message: `Operator Injected Fault: [${faultName.toUpperCase()}]`,
      });
    } else {
      // Check if any other faults remain active
      const remainingFaults = Object.entries(get().faults).filter(([k, v]) => k !== faultName && v);
      if (remainingFaults.length === 0) {
        get().silenceAlarm();
      }
      get().addAlert({
        subsystem: 'FAULT-INJECTION',
        severity: 'NOMINAL',
        message: `Operator Cleared Fault: [${faultName.toUpperCase()}]`,
      });
    }
  },

  resetAllFaults: () => {
    engineSimulator.clearAllFaults();
    get().silenceAlarm();
    set({
      faults: {
        injectorAbnormality: false,
        ignitionMisfire: false,
        lubricationLeak: false,
        coolingDegradation: false,
        abnormalVibration: false,
        sensorDrift: false,
      }
    });
    get().addAlert({
      subsystem: 'FAULT-INJECTION',
      severity: 'NOMINAL',
      message: 'All Operator Fault Injections Reset to Nominal Baseline',
    });
  },

  // Operational Controls
  setThrottle: (val) => {
    engineSimulator.setThrottle(val);
    set((state) => ({
      telemetry: { ...state.telemetry, throttle: val }
    }));
  },

  setAltitude: (val) => {
    engineSimulator.setAltitude(val);
    set((state) => ({
      telemetry: { ...state.telemetry, altitude: val }
    }));
  },

  // Mission Simulation & Replay Lab
  missionReplay: {
    isPlaying: true,
    speed: 1.0, // 0.5, 1, 2, 5, 10
    currentMissionTimeSec: 0,
    maxMissionDurationSec: 3600 * 4, // 4 hours
    scenarioPreset: 'dataset-continuous',
  },

  setReplaySpeed: (speed) => set((state) => ({
    missionReplay: { ...state.missionReplay, speed }
  })),

  togglePlayPause: () => set((state) => ({
    missionReplay: { ...state.missionReplay, isPlaying: !state.missionReplay.isPlaying }
  })),

  setMissionScenario: (scenario) => {
    set((state) => ({
      missionReplay: { ...state.missionReplay, scenarioPreset: scenario }
    }));

    if (scenario === 'csv-normal') {
      get().setDatasetMode('normal');
    } else if (scenario === 'csv-faulty') {
      get().setDatasetMode('faulty');
    } else if (scenario === 'high-altitude-ladakh') {
      engineSimulator.setAltitude(5500);
      engineSimulator.setThrottle(82);
    } else if (scenario === 'desert-hot') {
      engineSimulator.setAltitude(800);
      engineSimulator.setThrottle(88);
    }
  },

  // Main Telemetry Ticking Engine (Called at 10Hz)
  tick: (dt = 0.1) => {
    const { isPlaying, speed } = get().missionReplay;
    if (!isPlaying) return;

    const actualDt = dt * speed;
    const { datasetMode, datasetProgressFloat } = get();

    let newTelemetry;
    let nextIndex = get().datasetIndex;
    let nextFloat = datasetProgressFloat;

    if (datasetMode === 'normal' || datasetMode === 'faulty') {
      const rows = datasetLoader.getRows(datasetMode);
      const rowCount = rows.length;

      // Advance row progress (approx 1 row per second at 1x speed)
      nextFloat = (datasetProgressFloat + actualDt * 1.0) % rowCount;
      nextIndex = Math.floor(nextFloat);

      const currentRow = rows[nextIndex] || rows[0];
      newTelemetry = datasetLoader.mapCsvRowToTelemetry(currentRow, get().telemetry);

      // Trigger automatic tactical alert on anomaly transitions in faulty dataset
      if (datasetMode === 'faulty') {
        const prevIdx = get().datasetIndex;
        if (prevIdx < 51 && nextIndex >= 51) {
          get().addAlert({
            subsystem: 'ML-DIAGNOSTICS',
            severity: 'WARNING',
            message: 'ANOMALY ONSET (Row 52): Cylinder Head Thermal Rise (>230°C) + Injector Disparity',
          });
        } else if (prevIdx < 71 && nextIndex >= 71) {
          get().addAlert({
            subsystem: 'ML-DIAGNOSTICS',
            severity: 'CRITICAL',
            message: 'CRITICAL MULTI-FAULT (Row 72): Oil Pressure Drop (<38 PSI) + Severe Vibration (>7.0g)',
          });
        }
      }
    } else {
      newTelemetry = engineSimulator.step(actualDt);
    }

    const newDiagnostics = mlDiagnosticsService.evaluate(newTelemetry);

    // Format current timestamp
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    set((state) => {
      const maxHistory = 30; // keep last 30 data points for graphs
      const h = state.history;

      return {
        datasetIndex: nextIndex,
        datasetProgressFloat: nextFloat,
        telemetry: newTelemetry,
        diagnostics: newDiagnostics,
        history: {
          timestamps: [...h.timestamps.slice(-maxHistory), timeStr],
          rpm: [...h.rpm.slice(-maxHistory), Math.round(newTelemetry.rpm)],
          cht1: [...h.cht1.slice(-maxHistory), Math.round(newTelemetry.cht1 * 10) / 10],
          cht2: [...h.cht2.slice(-maxHistory), Math.round(newTelemetry.cht2 * 10) / 10],
          egt1: [...h.egt1.slice(-maxHistory), Math.round(newTelemetry.egt1 * 10) / 10],
          egt2: [...h.egt2.slice(-maxHistory), Math.round(newTelemetry.egt2 * 10) / 10],
          expectedEgt: [...h.expectedEgt.slice(-maxHistory), Math.round(newTelemetry.expectedEgt * 10) / 10],
          oilPressure: [...h.oilPressure.slice(-maxHistory), Math.round(newTelemetry.oilPressurePsi * 10) / 10],
          oilTemp: [...h.oilTemp.slice(-maxHistory), Math.round(newTelemetry.oilTemperatureC * 10) / 10],
          fuelFlow: [...h.fuelFlow.slice(-maxHistory), Math.round(newTelemetry.fuelFlowLph * 10) / 10],
          vibration: [...h.vibration.slice(-maxHistory), Math.round(newTelemetry.vibrationMean * 100) / 100],
          healthHistory: [...h.healthHistory.slice(-maxHistory), newDiagnostics.healthPercent],
        },
        missionReplay: {
          ...state.missionReplay,
          currentMissionTimeSec: state.missionReplay.currentMissionTimeSec + actualDt,
        }
      };
    });
  }
}));
