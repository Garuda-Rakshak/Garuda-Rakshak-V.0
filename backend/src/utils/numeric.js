'use strict';

/**
 * Numeric utility helpers for the AeroTwin thermal solver and optimizer.
 */

/**
 * Gaussian (normal) PDF value — used for PCM apparent heat capacity.
 * @param {number} x   - Input temperature (°C)
 * @param {number} mu  - Mean / melt point (°C)
 * @param {number} sigma - Standard deviation (°C)
 * @returns {number}
 */
function gaussian(x, mu, sigma) {
  const exponent = -0.5 * ((x - mu) / sigma) ** 2;
  return Math.exp(exponent) / (sigma * Math.sqrt(2 * Math.PI));
}

/**
 * Clamp a value between lo and hi.
 */
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Generate an array of N evenly-spaced values from start to end (inclusive).
 */
function linspace(start, end, n) {
  if (n <= 1) return [start];
  const step = (end - start) / (n - 1);
  return Array.from({ length: n }, (_, i) => start + i * step);
}

/**
 * Linear interpolation.
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor [0,1]
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Compute arithmetic mean of an array.
 */
function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/**
 * Compute sample standard deviation.
 */
function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

/**
 * Convert degrees to radians.
 */
function deg2rad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Convert radians to degrees.
 */
function rad2deg(rad) {
  return (rad * 180) / Math.PI;
}

/**
 * Atmospheric pressure at altitude (Pa) — barometric formula.
 * @param {number} altitude_m - Altitude above sea level (m)
 */
function pressureAtAltitude(altitude_m) {
  // International Standard Atmosphere (ISA) barometric formula
  const T0 = 288.15; // K
  const L  = 0.0065; // K/m
  const P0 = 101325; // Pa
  const g  = 9.80665;
  const M  = 0.0289644;
  const R  = 8.314462;
  return P0 * Math.pow(1 - (L * altitude_m) / T0, (g * M) / (R * L));
}

/**
 * Air density at altitude (kg/m³).
 * @param {number} altitude_m - Altitude (m)
 * @param {number} T_C - Temperature (°C)
 */
function airDensityAtAltitude(altitude_m, T_C) {
  const P = pressureAtAltitude(altitude_m);
  const R_specific = 287.058; // J/(kg·K)
  return P / (R_specific * (T_C + 273.15));
}

/**
 * Compute the relative air mass using Kasten & Young 1989 formula.
 * @param {number} solarAltitudeDeg - Solar elevation angle in degrees (0 at horizon)
 * @returns {number} Air mass (dimensionless)
 */
function relativeAirMass(solarAltitudeDeg) {
  if (solarAltitudeDeg <= 0) return Infinity;
  const z = 90 - solarAltitudeDeg; // zenith angle
  const zRad = deg2rad(z);
  return 1 / (Math.cos(zRad) + 0.50572 * Math.pow(96.07995 - z, -1.6364));
}

/**
 * Normalize angle to [0, 360).
 */
function normalizeDeg(deg) {
  return ((deg % 360) + 360) % 360;
}

/**
 * Generate a random float in [lo, hi].
 */
function randFloat(lo, hi) {
  return lo + Math.random() * (hi - lo);
}

/**
 * Generate a random integer in [lo, hi] (inclusive).
 */
function randInt(lo, hi) {
  return Math.floor(lo + Math.random() * (hi - lo + 1));
}

module.exports = {
  gaussian,
  clamp,
  linspace,
  lerp,
  mean,
  stddev,
  deg2rad,
  rad2deg,
  pressureAtAltitude,
  airDensityAtAltitude,
  relativeAirMass,
  normalizeDeg,
  randFloat,
  randInt,
};
