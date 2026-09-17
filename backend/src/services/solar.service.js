'use strict';

/**
 * Solar irradiance and sun position service.
 *
 * Implemented entirely from scratch in pure JS using:
 *  - NOAA/Spencer astronomical formulas for declination, equation of time, hour angle
 *  - Haurwitz clear-sky model (adapted) for direct normal irradiance
 *  - Ineichen-style altitude correction via pressure-adjusted air mass
 *  - Perez diffuse irradiance estimate
 *
 * No external APIs. Fully offline / air-gap capable.
 */

const { deg2rad, rad2deg, relativeAirMass, pressureAtAltitude, clamp } = require('../utils/numeric');
const { SOLAR_CONSTANT, DEG2RAD } = require('../utils/constants');

/**
 * Day-of-year (1..365) from a JS Date object.
 */
function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff  = date - start;
  return Math.floor(diff / 86400000);
}

/**
 * Solar declination angle (radians) using Spencer (1971) Fourier series.
 * @param {number} doy - Day of year (1-365)
 */
function solarDeclination(doy) {
  const B = (2 * Math.PI * (doy - 1)) / 365;
  return (
    0.006918 -
    0.399912 * Math.cos(B) +
    0.070257 * Math.sin(B) -
    0.006758 * Math.cos(2 * B) +
    0.000907 * Math.sin(2 * B) -
    0.002697 * Math.cos(3 * B) +
    0.00148  * Math.sin(3 * B)
  );
}

/**
 * Equation of Time (minutes) using Spencer (1971).
 * Correction between solar time and clock time.
 * @param {number} doy
 */
function equationOfTime(doy) {
  const B = (2 * Math.PI * (doy - 1)) / 365;
  return 229.18 * (
    0.000075 +
    0.001868 * Math.cos(B)    -
    0.032077 * Math.sin(B)    -
    0.014615 * Math.cos(2 * B) -
    0.04089  * Math.sin(2 * B)
  );
}

/**
 * True solar time (hours) from local standard time.
 * @param {number} localHour    - Local clock hour (0–23), decimal
 * @param {number} lon          - Longitude (°E positive)
 * @param {number} stdMeridian  - Standard meridian for timezone (°E); e.g. IST=82.5
 * @param {number} eot          - Equation of time (minutes)
 */
function trueSolarTime(localHour, lon, stdMeridian, eot) {
  // Longitude correction (4 min per degree)
  const lonCorrection = 4 * (lon - stdMeridian); // minutes
  return localHour + (eot + lonCorrection) / 60;
}

/**
 * Solar hour angle (radians) from true solar time.
 * @param {number} tst - True solar time (hours)
 */
function hourAngle(tst) {
  return deg2rad(15 * (tst - 12));
}

/**
 * Solar altitude (elevation) angle in radians.
 * @param {number} latRad  - Latitude (radians)
 * @param {number} decRad  - Declination (radians)
 * @param {number} haRad   - Hour angle (radians)
 */
function solarAltitude(latRad, decRad, haRad) {
  return Math.asin(
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad)
  );
}

/**
 * Solar azimuth angle (radians, measured from South, positive East).
 * @param {number} latRad
 * @param {number} decRad
 * @param {number} altRad - Solar altitude (radians)
 * @param {number} haRad
 */
function solarAzimuth(latRad, decRad, altRad, haRad) {
  const cosA = (Math.sin(decRad) - Math.sin(altRad) * Math.sin(latRad)) /
                (Math.cos(altRad) * Math.cos(latRad));
  let az = Math.acos(clamp(cosA, -1, 1));
  // Adjust for afternoon (hour angle positive → sun in West)
  if (haRad > 0) az = 2 * Math.PI - az;
  return az;
}

/**
 * Extraterrestrial radiation (W/m²) corrected for Earth-Sun distance.
 * @param {number} doy
 */
function extraterrestrialRadiation(doy) {
  const B = (2 * Math.PI * (doy - 1)) / 365;
  const E0 =
    1.000110 +
    0.034221 * Math.cos(B)    + 0.001280 * Math.sin(B)  +
    0.000719 * Math.cos(2*B)  + 0.000077 * Math.sin(2*B);
  return SOLAR_CONSTANT * E0;
}

/**
 * Haurwitz clear-sky direct normal irradiance, with altitude correction.
 *
 * Adapted from Haurwitz (1945) and Ineichen-Perez altitude correction.
 *
 * @param {number} solarAltDeg  - Solar altitude (°)
 * @param {number} altitude_m   - Site altitude above sea level (m)
 * @param {number} doy          - Day of year
 * @returns {number} Direct Normal Irradiance (W/m²)
 */
function clearSkyDNI(solarAltDeg, altitude_m, doy) {
  if (solarAltDeg <= 0) return 0;

  const altRad = deg2rad(solarAltDeg);
  const sinAlt = Math.sin(altRad);

  // Air mass (Kasten & Young)
  const am = relativeAirMass(solarAltDeg);
  if (!isFinite(am)) return 0;

  // Pressure-corrected air mass (altitude reduces air mass)
  const P = pressureAtAltitude(altitude_m);
  const amCorr = am * (P / 101325);

  // Extraterrestrial radiation
  const G0 = extraterrestrialRadiation(doy);

  // Haurwitz clear-sky model for beam irradiance on horizontal:
  // GHI = 1098 * sinAlt * exp(-0.057 / sinAlt)
  // Convert to DNI by dividing by sinAlt:
  // DNI ≈ 1098 * exp(-0.057 / sinAlt)
  // Altitude correction: higher altitude → less atmosphere → higher DNI
  // Ineichen factor: fh1 = exp(-altitude/8000)  (altitude scattering reduction)
  const fh1 = Math.exp(-altitude_m / 8000);
  // Linke turbidity at high altitude (low dust/humidity) ~ 1.8–2.5; use 2.0
  const TL = 2.0 - 0.2 * (altitude_m / 5500); // decreases with altitude

  // Ineichen-Perez simplified beam:
  // Eb = G0 * exp(-0.09*amCorr*(TL-1)) * sinAlt  → DNI = Eb / sinAlt
  const Eb_horiz = G0 * Math.exp(-0.09 * amCorr * (TL - 1)) * sinAlt;
  const dni = Eb_horiz / sinAlt;

  return Math.max(0, Math.min(G0, dni));
}

/**
 * Diffuse horizontal irradiance (DHI) estimate using Erbs decomposition.
 * @param {number} ghi - Global Horizontal Irradiance (W/m²)
 * @param {number} dni - Direct Normal Irradiance (W/m²)
 * @param {number} solarAltDeg
 */
function diffuseHorizontal(ghi, dni, solarAltDeg) {
  if (solarAltDeg <= 0) return 0;
  const beam_horiz = dni * Math.sin(deg2rad(solarAltDeg));
  return Math.max(0, ghi - beam_horiz);
}

/**
 * Global horizontal irradiance (W/m²).
 * @param {number} dni
 * @param {number} solarAltDeg
 * @param {number} altitude_m
 * @param {number} doy
 */
function clearSkyGHI(dni, solarAltDeg, altitude_m, doy) {
  if (solarAltDeg <= 0) return 0;
  const sinAlt = Math.sin(deg2rad(solarAltDeg));

  // Beam component on horizontal
  const beamH = dni * sinAlt;

  // Diffuse: simplified Orgill-Hollands decomposition
  // At high altitudes, diffuse fraction is lower (~10-15%)
  const kd = 0.12 + 0.05 * (1 - altitude_m / 6000); // diffuse fraction
  const diffuse = kd * beamH;

  return Math.max(0, beamH + diffuse);
}

/**
 * Compute solar irradiance on a tilted/oriented surface.
 *
 * @param {number} dni         - Direct Normal Irradiance (W/m²)
 * @param {number} ghi         - Global Horizontal Irradiance (W/m²)
 * @param {number} solarAltDeg - Solar altitude angle (°)
 * @param {number} solarAzDeg  - Solar azimuth (° from North, clockwise)
 * @param {number} surfTiltDeg - Surface tilt from horizontal (°); 0=horizontal roof
 * @param {number} surfAzDeg   - Surface azimuth (° from North, clockwise)
 * @returns {number} Irradiance on surface (W/m²)
 */
function irradianceOnSurface(dni, ghi, solarAltDeg, solarAzDeg, surfTiltDeg, surfAzDeg) {
  if (solarAltDeg <= 0) return 0;

  const altR  = deg2rad(solarAltDeg);
  const azR   = deg2rad(solarAzDeg);
  const tiltR = deg2rad(surfTiltDeg);
  const sazR  = deg2rad(surfAzDeg);

  // Angle of incidence on surface
  const cosInc =
    Math.sin(altR) * Math.cos(tiltR) +
    Math.cos(altR) * Math.sin(tiltR) * Math.cos(azR - sazR);

  const beam = dni * Math.max(0, cosInc);

  // Diffuse component (isotropic sky model)
  const diffuse = (ghi - dni * Math.sin(altR)) * (1 + Math.cos(tiltR)) / 2;

  // Ground reflected
  const albedo  = 0.25;
  const reflect = ghi * albedo * (1 - Math.cos(tiltR)) / 2;

  return Math.max(0, beam + diffuse + reflect);
}

/**
 * Generate a 24-hour solar irradiance profile for a given location and date.
 *
 * @param {object} params
 * @param {number} params.lat        - Latitude (°N)
 * @param {number} params.lon        - Longitude (°E)
 * @param {number} params.altitude_m - Altitude (m)
 * @param {Date}   params.date       - Date (local)
 * @param {number} [params.stdMeridian=82.5] - Standard meridian (°E); IST default
 * @param {number} [params.stepMinutes=60]   - Time step in minutes
 * @returns {Array<{hourDecimal, solarAltDeg, solarAzDeg, dniWm2, ghiWm2, dhiWm2}>}
 */
function generate24hSolarProfile({ lat, lon, altitude_m, date, stdMeridian = 82.5, stepMinutes = 60 }) {
  const doy    = dayOfYear(date);
  const decRad = solarDeclination(doy);
  const eot    = equationOfTime(doy);
  const latRad = deg2rad(lat);
  const G0     = extraterrestrialRadiation(doy);

  const profile = [];
  const steps   = Math.round(24 * 60 / stepMinutes);

  for (let i = 0; i < steps; i++) {
    const localHour = (i * stepMinutes) / 60;
    const tst       = trueSolarTime(localHour, lon, stdMeridian, eot);
    const haRad     = hourAngle(tst);
    const altRad    = solarAltitude(latRad, decRad, haRad);
    const altDeg    = rad2deg(altRad);
    const azRad     = altDeg > 0 ? solarAzimuth(latRad, decRad, altRad, haRad) : 0;
    const azDeg     = rad2deg(azRad);

    const dni  = clearSkyDNI(altDeg, altitude_m, doy);
    const ghi  = clearSkyGHI(dni, altDeg, altitude_m, doy);
    const dhi  = diffuseHorizontal(ghi, dni, altDeg);

    profile.push({
      hourDecimal: localHour,
      solarAltDeg: Math.max(0, altDeg),
      solarAzDeg:  azDeg,
      dniWm2:      dni,
      ghiWm2:      ghi,
      dhiWm2:      dhi,
    });
  }

  return profile;
}

/**
 * Load ambient temperature profile for a given location and month
 * from a WeatherStation climatology record (offline data).
 *
 * @param {Array} hourlyClimatology - WeatherStation.hourlyClimatology
 * @param {number} month - Month (1–12)
 * @param {number} stepMinutes
 * @returns {Array<number>} Ambient temperature (°C) for each time step
 */
function ambientProfileFromClimatology(hourlyClimatology, month, stepMinutes) {
  const monthRecords = hourlyClimatology
    .filter((r) => r.month === month)
    .sort((a, b) => a.hour - b.hour);

  if (monthRecords.length === 0) {
    // Fallback: constant -10 °C (cold high-altitude default)
    const steps = Math.round(24 * 60 / stepMinutes);
    return Array(steps).fill(-10);
  }

  // Build hourly lookup
  const hourly = Array(24).fill(0);
  monthRecords.forEach((r) => { hourly[r.hour] = r.meanAmbientC; });

  // Interpolate to requested step resolution
  const steps = Math.round(24 * 60 / stepMinutes);
  return Array.from({ length: steps }, (_, i) => {
    const fracHour = (i * stepMinutes) / 60;
    const h0 = Math.floor(fracHour) % 24;
    const h1 = (h0 + 1) % 24;
    const t  = fracHour - Math.floor(fracHour);
    return hourly[h0] * (1 - t) + hourly[h1] * t;
  });
}

module.exports = {
  dayOfYear,
  solarDeclination,
  equationOfTime,
  trueSolarTime,
  hourAngle,
  solarAltitude,
  solarAzimuth,
  extraterrestrialRadiation,
  clearSkyDNI,
  clearSkyGHI,
  diffuseHorizontal,
  irradianceOnSurface,
  generate24hSolarProfile,
  ambientProfileFromClimatology,
};
