/**
 * Garuda-Rakshak MALE UAV Aero-Piston Engine Physics Simulator
 * 
 * High-fidelity 4-stroke aero-piston engine thermodynamic simulator with
 * atmospheric altitude lapse rate, manifold pressure dynamics, cylinder heat transfer,
 * lubrication viscosity curves, and realistic stochastic sensor noise.
 */

export class EnginePhysicsSimulator {
  constructor() {
    this.state = {
      // Operational state
      rpm: 4850,
      throttle: 78,              // 0 - 100 %
      altitude: 3500,            // meters (e.g. Leh / Ladakh altitude)
      airspeedKts: 110,          // Knots True Airspeed (KTAS)
      manifoldPressureInHg: 34.2,// inHg
      
      // Combustion & Thermal
      cht1: 168.4,               // Cylinder 1 Head Temp (°C)
      cht2: 171.2,               // Cylinder 2 Head Temp (°C)
      egt1: 678.5,               // Exhaust Gas Temp Cyl 1 (°C)
      egt2: 684.0,               // Exhaust Gas Temp Cyl 2 (°C)
      expectedEgt: 665.0,        // Physics baseline expected EGT (°C)
      egtResidual: 16.2,         // Delta (°C)
      
      // Lubrication & Fluid
      oilPressurePsi: 54.2,      // PSI (Normal 40 - 65)
      oilTemperatureC: 86.5,     // °C (Normal 75 - 110)
      fuelFlowLph: 19.4,         // Liters / hour
      fuelFlowPerRpm: 0.0040,    // L/h per RPM efficiency
      
      // Dynamics & Vibration
      vibrationX: 0.28,          // g-RMS
      vibrationY: 0.32,          // g-RMS
      vibrationZ: 0.41,          // g-RMS
      vibrationMean: 0.34,       // g-RMS
      vibrationStd: 0.05,
      
      // Electrical & Ignition
      batteryVoltage: 28.2,      // Volts DC
      alternatorCurrent: 32.5,   // Amperes
      injectionTimingBtdc: 22.4, // ° Before Top Dead Center
      
      // Environment
      ambientTemperatureC: -7.75,// Lapse rate from 15°C at MSL
      ambientPressureHpa: 657.8, // Barometric pressure at altitude
      airDensityKgm3: 0.863,     // Air density at altitude (kg/m³)
      
      // Mission Counters
      fuelRemainingLiters: 142.5,
      flightTimeSeconds: 4820,
      engineOperatingHours: 342.8,
    };

    // Active fault injections
    this.faults = {
      injectorAbnormality: false,
      ignitionMisfire: false,
      lubricationLeak: false,
      coolingDegradation: false,
      abnormalVibration: false,
      sensorDrift: false,
    };
  }

  setThrottle(throttle) {
    this.state.throttle = Math.max(0, Math.min(100, throttle));
  }

  setAltitude(altitude) {
    this.state.altitude = Math.max(0, Math.min(9000, altitude));
  }

  setFault(faultName, isActive) {
    if (this.faults.hasOwnProperty(faultName)) {
      this.faults[faultName] = isActive;
    }
  }

  clearAllFaults() {
    Object.keys(this.faults).forEach(k => this.faults[k] = false);
  }

  /**
   * Advance simulation step by dt seconds (e.g. 0.1s for 10Hz telemetry updates)
   */
  step(dt = 0.1) {
    const s = this.state;
    const f = this.faults;

    // 1. Environmental calculations based on standard atmospheric lapse rate
    const seaLevelTemp = 15.0; // °C
    s.ambientTemperatureC = seaLevelTemp - 0.0065 * s.altitude;
    s.ambientPressureHpa = 1013.25 * Math.pow(1 - 0.0000225577 * s.altitude, 5.25588);
    const T_kelvin = s.ambientTemperatureC + 273.15;
    s.airDensityKgm3 = (s.ambientPressureHpa * 100) / (287.058 * T_kelvin);

    // 2. RPM dynamics based on throttle, altitude density ratio, and faults
    const targetRpm = 1600 + (s.throttle / 100) * 4200 * (s.airDensityKgm3 / 1.225 * 0.3 + 0.7);
    const rpmInertia = 0.12;
    s.rpm += (targetRpm - s.rpm) * (dt / rpmInertia);

    if (f.ignitionMisfire) {
      s.rpm += (Math.random() - 0.5) * 180; // RPM oscillation
    }

    // 3. Manifold Absolute Pressure (MAP)
    const baseMap = (s.ambientPressureHpa / 33.8639) * (0.4 + (s.throttle / 100) * 0.6);
    // Turbocharger boost contribution at high throttle
    const turboBoost = s.throttle > 60 ? ((s.throttle - 60) / 40) * 8.5 : 0;
    s.manifoldPressureInHg = baseMap + turboBoost;

    // 4. Physics-Informed Expected EGT baseline formula
    s.expectedEgt = 300 + 0.025 * s.rpm + 1.2 * s.throttle - 0.005 * s.altitude + 1.5 * s.ambientTemperatureC;

    // 5. Actual EGT and CHT Thermal dynamics with thermal mass lag
    let targetEgt1 = s.expectedEgt + 12 + (Math.random() - 0.5) * 4;
    let targetEgt2 = s.expectedEgt + 18 + (Math.random() - 0.5) * 4;

    let targetCht1 = 120 + (s.rpm / 5800) * 55 + (s.throttle / 100) * 20 - (s.airspeedKts / 150) * 15;
    let targetCht2 = targetCht1 + 3.5;

    // Fault injection thermal impacts
    if (f.injectorAbnormality) {
      targetEgt1 += 95; // Lean combustion in cylinder 1 creates severe EGT spike
      targetCht1 += 32;
    }
    if (f.coolingDegradation) {
      targetCht1 += 45;
      targetCht2 += 48;
    }
    if (f.ignitionMisfire) {
      targetEgt2 -= 140; // Unburnt fuel drops EGT in cylinder 2
    }

    // Thermal inertia integration (temperatures don't jump instantaneously)
    const thermalTauCht = 4.0; // seconds
    const thermalTauEgt = 1.5; // seconds
    s.cht1 += (targetCht1 - s.cht1) * (dt / thermalTauCht);
    s.cht2 += (targetCht2 - s.cht2) * (dt / thermalTauCht);
    s.egt1 += (targetEgt1 - s.egt1) * (dt / thermalTauEgt);
    s.egt2 += (targetEgt2 - s.egt2) * (dt / thermalTauEgt);

    const meanActualEgt = (s.egt1 + s.egt2) / 2;
    s.egtResidual = meanActualEgt - s.expectedEgt;

    // 6. Lubrication (Oil Pressure & Temperature)
    let targetOilPress = 30 + (s.rpm / 5800) * 32 - (s.oilTemperatureC - 80) * 0.15;
    let targetOilTemp = 70 + (s.rpm / 5800) * 25 + (s.throttle / 100) * 10;

    if (f.lubricationLeak) {
      targetOilPress = Math.max(12, targetOilPress - 34);
      targetOilTemp += 38;
    }

    s.oilPressurePsi += (targetOilPress - s.oilPressurePsi) * (dt / 2.0);
    s.oilTemperatureC += (targetOilTemp - s.oilTemperatureC) * (dt / 6.0);

    // 7. Fuel Flow
    let baseFuelFlow = 6.0 + (s.rpm / 5800) * 16.5 * (s.throttle / 100);
    if (f.injectorAbnormality) baseFuelFlow *= 0.82;
    s.fuelFlowLph = Math.max(2.0, baseFuelFlow + (Math.random() - 0.5) * 0.3);
    s.fuelFlowPerRpm = s.fuelFlowLph / Math.max(1, s.rpm);

    // 8. Vibration Signatures (3-Axis accelerometer)
    let baseVib = 0.15 + (s.rpm / 5800) * 0.22;
    if (f.abnormalVibration) baseVib += 0.65;
    if (f.ignitionMisfire) baseVib += 0.45;

    s.vibrationX = Math.max(0.05, baseVib * 0.85 + (Math.random() - 0.5) * 0.08);
    s.vibrationY = Math.max(0.05, baseVib * 1.05 + (Math.random() - 0.5) * 0.09);
    s.vibrationZ = Math.max(0.05, baseVib * 1.25 + (Math.random() - 0.5) * 0.12);
    s.vibrationMean = (s.vibrationX + s.vibrationY + s.vibrationZ) / 3;
    s.vibrationStd = Math.sqrt(
      Math.pow(s.vibrationX - s.vibrationMean, 2) +
      Math.pow(s.vibrationY - s.vibrationMean, 2) +
      Math.pow(s.vibrationZ - s.vibrationMean, 2)
    ) / Math.sqrt(3);

    // 9. Electrical & Injection Timing
    s.batteryVoltage = 28.0 + (s.rpm > 2000 ? 0.4 : -0.8) + (Math.random() - 0.5) * 0.05;
    s.alternatorCurrent = 24.0 + (s.rpm / 5800) * 18.0 + (Math.random() - 0.5) * 0.4;
    s.injectionTimingBtdc = 18.0 + (s.rpm / 5800) * 7.5;

    // 10. Sensor Drift Simulation
    if (f.sensorDrift) {
      s.cht1 += 28.0; // Artificial sensor offset
      s.oilPressurePsi = Math.max(5.0, s.oilPressurePsi - 18.0);
    }

    // 11. Mission fuel burn and time accumulation
    const fuelBurnRatePerSec = s.fuelFlowLph / 3600;
    s.fuelRemainingLiters = Math.max(0, s.fuelRemainingLiters - fuelBurnRatePerSec * dt);
    s.flightTimeSeconds += dt;
    s.engineOperatingHours += dt / 3600;

    return { ...s };
  }
}

export const engineSimulator = new EnginePhysicsSimulator();
