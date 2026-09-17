'use strict';

/**
 * FLIR Thermal Stealth Scoring Service — AeroTwin-Habitat
 *
 * Computes the thermal infrared signature of the shelter as seen by a FLIR sensor.
 * Goes beyond naive ΔT = skin - ambient by incorporating:
 *   1. Surface emissivity (ε)
 *   2. Sky and ground view factors (F_sky, F_gnd)
 *   3. Stefan-Boltzmann longwave radiation balance
 *   4. Atmospheric transmission attenuation (Beer-Lambert, mid-wave IR)
 *   5. Effective irradiance at sensor plane
 *
 * Reference: Minkina & Dudzik, "Infrared Thermography: Errors and Uncertainties" (2009)
 */

const { SIGMA_SB, FLIR_ABSORPTION_COEFF, FLIR_DEFAULT_DISTANCE_M } = require('../utils/constants');
const { clamp } = require('../utils/numeric');

// ─── Sky temperature models ──────────────────────────────────────────────────

/**
 * Effective sky temperature (K) using Swinbank (1963) formula.
 * T_sky = 0.0552 * T_amb^1.5  (K)
 * @param {number} T_ambK - Ambient temperature in Kelvin
 */
function swinbankSkyTempK(T_ambK) {
  return 0.0552 * Math.pow(T_ambK, 1.5);
}

/**
 * Ground temperature (K) — assumed slightly above ambient (ground storage effect).
 * @param {number} T_ambK - Ambient temperature in Kelvin
 */
function groundTempK(T_ambK) {
  return T_ambK + 3; // ground holds heat slightly better than ambient air
}

// ─── View factors ────────────────────────────────────────────────────────────

/**
 * Sky view factor for a flat roof surface (horizontal, upward-facing).
 * F_sky = 1 for fully exposed horizontal surface.
 * F_sky < 1 for tilted surfaces.
 * @param {number} tiltDeg - Surface tilt from horizontal (°); 0 = flat roof
 */
function skyViewFactor(tiltDeg = 0) {
  return (1 + Math.cos((tiltDeg * Math.PI) / 180)) / 2;
}

/**
 * Ground view factor = 1 - F_sky (assuming two-surface enclosure).
 */
function groundViewFactor(tiltDeg = 0) {
  return 1 - skyViewFactor(tiltDeg);
}

// ─── Atmospheric transmission ────────────────────────────────────────────────

/**
 * Atmospheric transmissivity in mid-wave IR (3–5 µm band) — Beer-Lambert law.
 * τ = exp(-α × d)
 * At high altitude (thin, dry air), absorption is lower → higher transmissivity.
 *
 * @param {number} distance_m  - Observer distance (m)
 * @param {number} altitude_m  - Site altitude (m) — reduces air density and absorption
 * @param {number} humidity    - Relative humidity (0–1), default 0.2 (dry high altitude)
 */
function atmosphericTransmissivity(distance_m, altitude_m = 3500, humidity = 0.2) {
  // Altitude correction: absorption decreases with altitude (thinner, drier air)
  const altitudeFactor = Math.exp(-altitude_m / 8000); // pressure scale height
  // Humidity correction: water vapour is main IR absorber
  const humidityFactor = 1 + humidity * 0.5;
  const alpha = FLIR_ABSORPTION_COEFF * altitudeFactor * humidityFactor;
  return Math.exp(-alpha * distance_m);
}

// ─── Radiant exitance and FLIR contrast ──────────────────────────────────────

/**
 * Radiant exitance (W/m²) of a surface at temperature T.
 * M = ε × σ × T⁴
 * @param {number} T_K       - Surface temperature (K)
 * @param {number} epsilon   - Surface emissivity (0–1)
 */
function radiantExitance(T_K, epsilon) {
  return epsilon * SIGMA_SB * Math.pow(T_K, 4);
}

/**
 * Apparent radiance (W/m²·sr) seen by a FLIR sensor.
 * Combines:
 *   - Emitted radiation from surface
 *   - Reflected sky radiation (via sky view factor)
 *   - Reflected ground radiation (via ground view factor)
 *   - Attenuated through atmosphere
 *   - Plus ambient path radiance
 *
 * @param {object} params
 * @param {number} params.T_skinC      - Shelter exterior skin temperature (°C)
 * @param {number} params.T_ambC       - Ambient air temperature (°C)
 * @param {number} params.emissivity   - Surface emissivity
 * @param {number} params.tiltDeg      - Surface tilt (°)
 * @param {number} params.altitude_m   - Site altitude (m)
 * @param {number} params.distance_m   - FLIR observation distance (m)
 * @param {number} params.humidity     - Relative humidity (0–1)
 * @returns {object} { apparentRadianceSurface, apparentRadianceBackground, flirDeltaC, stealthScore }
 */
function computeFlirSignature({
  T_skinC,
  T_ambC,
  emissivity    = 0.9,
  tiltDeg       = 0,
  altitude_m    = 3500,
  distance_m    = FLIR_DEFAULT_DISTANCE_M,
  humidity      = 0.2,
}) {
  const T_skinK = T_skinC + 273.15;
  const T_ambK  = T_ambC  + 273.15;

  const T_skyK  = swinbankSkyTempK(T_ambK);
  const T_gndK  = groundTempK(T_ambK);

  const F_sky  = skyViewFactor(tiltDeg);
  const F_gnd  = groundViewFactor(tiltDeg);

  const tau    = atmosphericTransmissivity(distance_m, altitude_m, humidity);
  const tau_bg = atmosphericTransmissivity(distance_m, altitude_m, humidity); // path to background

  // ── Surface radiance (W/m²) ───────────────────────────────────────────
  // Emitted by surface
  const M_emit = emissivity * SIGMA_SB * Math.pow(T_skinK, 4);

  // Reflected sky irradiance (1-ε fraction of incoming sky radiation)
  const G_sky  = SIGMA_SB * Math.pow(T_skyK, 4);  // sky irradiance arriving at surface
  const G_gnd  = SIGMA_SB * Math.pow(T_gndK, 4);  // ground irradiance arriving at surface
  const M_refl = (1 - emissivity) * (F_sky * G_sky + F_gnd * G_gnd);

  // Total exitance from surface
  const M_total_surface = M_emit + M_refl;

  // ── Background (ambient patch) radiance ───────────────────────────────
  // The background is sky (for upward-looking sensor) or ambient terrain
  const M_background = SIGMA_SB * Math.pow(T_ambK, 4);

  // ── Atmospheric path radiance (emission from atmosphere column) ───────
  // Simplified: atmosphere at T_amb emits (1-tau) * sigma * T_amb^4
  const M_path_atm = (1 - tau) * SIGMA_SB * Math.pow(T_ambK, 4);

  // ── Apparent radiance at sensor ───────────────────────────────────────
  const L_surface    = tau * M_total_surface   + M_path_atm;
  const L_background = tau_bg * M_background   + M_path_atm;

  // ── Compute equivalent blackbody temperatures seen by sensor ─────────
  // T_apparent = (L / sigma)^0.25  (treating as blackbody)
  const T_apparent_surface = Math.pow(Math.max(L_surface,    1) / SIGMA_SB, 0.25) - 273.15;
  const T_apparent_bg      = Math.pow(Math.max(L_background, 1) / SIGMA_SB, 0.25) - 273.15;

  // FLIR temperature contrast (what the FLIR measures)
  const flirDeltaC = T_apparent_surface - T_apparent_bg;

  // ── Stealth score ─────────────────────────────────────────────────────
  // Score 0–100: 100 = perfectly stealthy (ΔT = 0), 0 = highly detectable (ΔT ≥ 10°C)
  const maxDetectableDelta = 10; // °C — typical FLIR detection threshold
  const normalizedContrast = clamp(Math.abs(flirDeltaC) / maxDetectableDelta, 0, 1);
  const stealthScore       = Math.round((1 - normalizedContrast) * 100 * 100) / 100;

  return {
    T_skinC:                  Math.round(T_skinC             * 100) / 100,
    T_ambC:                   Math.round(T_ambC              * 100) / 100,
    T_skyC:                   Math.round((T_skyK - 273.15)   * 100) / 100,
    emissivity,
    skyViewFactor:            Math.round(F_sky                * 1000) / 1000,
    groundViewFactor:         Math.round(F_gnd                * 1000) / 1000,
    atmosphericTransmissivity:Math.round(tau                  * 10000)/ 10000,
    observationDistance_m:    distance_m,
    radiantExitanceSurface_Wm2: Math.round(M_total_surface   * 10) / 10,
    radiantExitanceBg_Wm2:    Math.round(M_background         * 10) / 10,
    flirDeltaC:               Math.round(flirDeltaC           * 100) / 100,
    stealthScore,
    detectionRisk:            flirDeltaC > 3 ? 'high' : flirDeltaC > 1 ? 'moderate' : 'low',
  };
}

module.exports = {
  computeFlirSignature,
  atmosphericTransmissivity,
  skyViewFactor,
  groundViewFactor,
  swinbankSkyTempK,
  radiantExitance,
};
