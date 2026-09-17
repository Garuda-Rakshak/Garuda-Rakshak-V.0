'use strict';

/**
 * Physical and engineering constants used across the AeroTwin thermal engine.
 */

// Stefan-Boltzmann constant (W·m⁻²·K⁻⁴)
const SIGMA_SB = 5.670374419e-8;

// Standard gravity (m/s²)
const G_STD = 9.80665;

// Universal gas constant (J·mol⁻¹·K⁻¹)
const R_GAS = 8.314462;

// Standard atmosphere sea-level pressure (Pa)
const P0_PA = 101325;

// Standard atmosphere sea-level temperature (K)
const T0_K = 288.15;

// Atmospheric temperature lapse rate (K/m)
const LAPSE_RATE = 0.0065;

// Molar mass of dry air (kg/mol)
const M_AIR = 0.0289644;

// Atmospheric scale height for simplified pressure model (m)
const SCALE_HEIGHT = 8500;

// Air density at sea level (kg/m³)
const RHO_AIR_SL = 1.225;

// Specific heat of air at constant pressure (J/kg·K)
const CP_AIR = 1005;

// Solar constant (W/m²) at top of atmosphere
const SOLAR_CONSTANT = 1361;

// Pi
const PI = Math.PI;

// Degrees to radians
const DEG2RAD = PI / 180;

// Radians to degrees
const RAD2DEG = 180 / PI;

// Mi-17 helicopter payload/volume limits
const MI17_PAYLOAD_KG  = 4000;
const MI17_VOLUME_M3   = 23;

// ALS (Ashok Leyland Stallion) truck limits
const ALS_PAYLOAD_KG   = 10000;
const ALS_VOLUME_M3    = 45;

// FLIR atmospheric absorption coefficient (m⁻¹) — mid-wave IR ~3–5 µm
const FLIR_ABSORPTION_COEFF = 0.00012; // per metre, calm dry air at altitude

// Default FLIR observation distance (m)
const FLIR_DEFAULT_DISTANCE_M = 500;

module.exports = {
  SIGMA_SB,
  G_STD,
  R_GAS,
  P0_PA,
  T0_K,
  LAPSE_RATE,
  M_AIR,
  SCALE_HEIGHT,
  RHO_AIR_SL,
  CP_AIR,
  SOLAR_CONSTANT,
  PI,
  DEG2RAD,
  RAD2DEG,
  MI17_PAYLOAD_KG,
  MI17_VOLUME_M3,
  ALS_PAYLOAD_KG,
  ALS_VOLUME_M3,
  FLIR_ABSORPTION_COEFF,
  FLIR_DEFAULT_DISTANCE_M,
};
