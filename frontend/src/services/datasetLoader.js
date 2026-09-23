/**
 * Garuda-Rakshak MALE UAV Continuous Telemetry Dataset Loader
 * 
 * Provides unified access to both:
 * 1. Normal continuous flight telemetry (120 rows nominal baseline)
 * 2. Faulty continuous engine telemetry (120 rows with progressive anomaly injection)
 */

import datasetJson from '../data/telemetryDatasets.json';

export class DatasetLoader {
  constructor() {
    this.datasets = {
      normal: datasetJson.normal || [],
      faulty: datasetJson.faulty || [],
    };
  }

  /**
   * Get all rows for a dataset type ('normal' | 'faulty')
   */
  getRows(datasetType = 'normal') {
    return this.datasets[datasetType] || this.datasets.normal;
  }

  /**
   * Get row count
   */
  getRowCount(datasetType = 'normal') {
    return (this.datasets[datasetType] || []).length;
  }

  /**
   * Fetch latest from backend API with fallback
   */
  async fetchFromBackend(datasetType = 'normal') {
    try {
      const res = await fetch(`/api/v1/ml/dataset/${datasetType}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.rows) && data.rows.length > 0) {
        this.datasets[datasetType] = data.rows;
        return data.rows;
      }
    } catch (err) {
      console.info(`[DatasetLoader] Backend fetch fallback to embedded data: ${err.message}`);
    }
    return this.getRows(datasetType);
  }

  /**
   * Map raw CSV row to full digital twin telemetry object
   */
  mapCsvRowToTelemetry(row, previousState = {}) {
    if (!row) return previousState;

    const rawRpm = Number(row.rpm) || 5000;
    const rawThrottle = Number(row.throttle) || 60;
    const rawAltitude = Number(row.altitude) || 4000;
    const rawAmbientTemp = Number(row.ambient_temperature) || 28;
    const rawCht = Number(row.cht) || 220;
    const rawEgt = Number(row.egt) || 530;
    const rawOilPressure = Number(row.oil_pressure) || 60;
    const rawOilTemp = Number(row.oil_temperature) || 86;
    const rawFuelFlow = Number(row.fuel_flow) || 28;
    const rawVibration = Number(row.vibration) || 2.0;
    const rawBatteryVoltage = Number(row.battery_voltage) || 26.0;
    const rawAlternatorCurrent = Number(row.alternator_current) || 22.0;
    const rawInjectionTiming = Number(row.injection_timing) || 20.5;
    const faultType = row.fault_type || 'normal';
    const scenario = row.scenario || 'Telemetry Stream';

    // Physics-informed expected EGT formula
    const expectedEgt = 300 + 0.025 * rawRpm + 1.2 * rawThrottle - 0.005 * rawAltitude + 1.5 * rawAmbientTemp;
    const egtResidual = rawEgt - expectedEgt;

    // Dual-cylinder temperature dynamics (using exact CSV CHT as central value)
    const cht1 = Math.round((rawCht - 1.2) * 10) / 10;
    const cht2 = Math.round((rawCht + 1.2) * 10) / 10;
    
    // Injector abnormality creates cylinder-to-cylinder EGT asymmetry
    const isInjectorFault = faultType.includes('injector_abnormality');
    const egt1 = Math.round((rawEgt + (isInjectorFault ? 32.0 : -2.5)) * 10) / 10;
    const egt2 = Math.round((rawEgt - (isInjectorFault ? 22.0 : -2.5)) * 10) / 10;

    // 3-axis vibration decomposition
    const vibrationMean = Math.round(rawVibration * 100) / 100;
    const vibrationX = Math.round(rawVibration * 0.88 * 100) / 100;
    const vibrationY = Math.round(rawVibration * 1.02 * 100) / 100;
    const vibrationZ = Math.round(rawVibration * 1.15 * 100) / 100;
    const vibrationStd = Math.round((0.04 + rawVibration * 0.06) * 100) / 100;

    // Manifold pressure estimation
    const baseMap = 29.92 * Math.pow(1 - 0.0000225577 * rawAltitude, 5.25588);
    const manifoldPressureInHg = Math.round((baseMap + (rawThrottle / 100) * 8.5) * 10) / 10;

    return {
      ...previousState,
      // Exact Raw CSV Mirror
      rawRow: { ...row },
      
      // Core Operational
      rpm: Math.round(rawRpm),
      throttle: Math.round(rawThrottle * 10) / 10,
      altitude: Math.round(rawAltitude),
      airspeedKts: Math.round(105 + (rawThrottle / 100) * 35),
      ambientTemperatureC: Math.round(rawAmbientTemp * 10) / 10,
      manifoldPressureInHg,
      
      // Thermal
      cht: Math.round(rawCht * 10) / 10,
      cht1,
      cht2,
      meanCht: Math.round(rawCht * 10) / 10,
      egt: Math.round(rawEgt * 10) / 10,
      egt1,
      egt2,
      meanEgt: Math.round(rawEgt * 10) / 10,
      expectedEgt: Math.round(expectedEgt * 10) / 10,
      egtResidual: Math.round(egtResidual * 10) / 10,
      
      // Lubrication & Fluid
      oilPressurePsi: Math.round(rawOilPressure * 10) / 10,
      oilTemperatureC: Math.round(rawOilTemp * 10) / 10,
      fuelFlowLph: Math.round(rawFuelFlow * 10) / 10,
      fuelFlowPerRpm: Math.round((rawFuelFlow / Math.max(1, rawRpm)) * 10000) / 10000,
      
      // Dynamics & Vibration
      vibration: vibrationMean,
      vibrationX,
      vibrationY,
      vibrationZ,
      vibrationMean,
      vibrationStd,
      
      // Electrical & Ignition
      batteryVoltage: Math.round(rawBatteryVoltage * 100) / 100,
      alternatorCurrent: Math.round(rawAlternatorCurrent * 10) / 10,
      injectionTimingBtdc: Math.round(rawInjectionTiming * 10) / 10,
      
      // Ground Truth Metadata
      groundTruthFault: faultType,
      scenario,
      csvTimestamp: row.timestamp || new Date().toISOString(),
      rowIndex: row.rowIndex !== undefined ? row.rowIndex : 0,
      isContinuousDataset: true,
    };
  }
}

export const datasetLoader = new DatasetLoader();
