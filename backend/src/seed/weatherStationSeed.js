'use strict';

/**
 * Weather Station Seed Script — AeroTwin-Habitat
 *
 * Pre-loads offline hourly climatology for 3 high-altitude Indian stations:
 *   - Leh       (34.15°N, 77.58°E, 3500 m)
 *   - Nyoma     (33.17°N, 78.65°E, 4230 m)
 *   - Siachen   (35.42°N, 77.11°E, 5500 m)
 *
 * Data is SYNTHETIC but physically plausible:
 *   - Temperature: sinusoidal seasonal + diurnal variation calibrated to known
 *     climatological records for the Ladakh/Karakoram region.
 *   - DNI: altitude-adjusted clear-sky model with seasonal variation.
 *
 * ⚠️  Q&A NOTE: This is synthetic offline data — not live/measured.
 *     Required for air-gapped deployment (no external API calls at runtime).
 *
 * Run: npm run seed
 */

require('dotenv').config();
const mongoose      = require('mongoose');
const WeatherStation = require('../models/WeatherStation');

// ─── Station definitions ──────────────────────────────────────────────────────

const STATIONS = [
  {
    stationName: 'Leh',
    lat:         34.15,
    lon:         77.58,
    altitude_m:  3500,
    // Monthly mean temperature at 14:00 local (°C) — warmest hour
    monthlyMeanMaxC: [-6.5, -3.2, 4.0, 11.8, 17.2, 21.5, 25.0, 24.3, 18.5, 11.0, 1.8, -4.8],
    // Monthly mean temperature at 05:00 local (°C) — coldest hour
    monthlyMeanMinC: [-14.5,-12.1,-5.8, 1.2,  6.5, 11.0, 14.8, 14.1,  8.2,  1.5,-7.5,-13.2],
    // Monthly mean DNI at solar noon (W/m²)
    monthlyMeanDNI:  [680, 710, 760, 820, 870, 900, 850, 840, 870, 820, 730, 660],
  },
  {
    stationName: 'Nyoma',
    lat:         33.17,
    lon:         78.65,
    altitude_m:  4230,
    monthlyMeanMaxC: [-9.5, -6.2, 0.5,  8.2, 13.8, 18.2, 22.0, 21.5, 15.0,  7.2,-2.5,-8.5],
    monthlyMeanMinC: [-17.2,-15.0,-9.5,-1.8,  3.2,  7.5, 12.0, 11.5,  5.5, -1.5,-10.0,-16.0],
    monthlyMeanDNI:  [720, 750, 800, 860, 910, 940, 890, 880, 910, 860, 770, 700],
  },
  {
    stationName: 'Siachen',
    lat:         35.42,
    lon:         77.11,
    altitude_m:  5500,
    monthlyMeanMaxC: [-18.0,-15.2,-9.5,-2.0,  4.5,  9.0, 13.5, 13.0,  6.5, -1.5,-10.0,-17.0],
    monthlyMeanMinC: [-28.5,-26.5,-22.0,-14.5,-7.5, -2.0,  2.0,  1.5, -5.0,-13.5,-22.5,-27.5],
    monthlyMeanDNI:  [760, 790, 840, 900, 950, 980, 930, 920, 950, 900, 810, 740],
  },
];

// ─── Climatology generation ───────────────────────────────────────────────────

/**
 * Generate hourly climatology for a station.
 * 12 months × 24 hours = 288 records.
 *
 * Temperature model:
 *   T(month, hour) = (Tmax + Tmin)/2 + (Tmax - Tmin)/2 * sin(π*(hour-5)/12)
 *   Peak at hour=14, trough at hour=5.
 *
 * DNI model:
 *   DNI at hour h = DNI_noon * max(0, sin(π * (h - sunrise) / (sunset - sunrise)))
 *   Sunrise ≈ 6h, sunset ≈ 18h (simplification; varies by season/lat).
 */
function generateClimatology(station) {
  const records = [];
  const { monthlyMeanMaxC, monthlyMeanMinC, monthlyMeanDNI, altitude_m } = station;

  // Sunrise/sunset hours vary by month (simplified: longer days in summer)
  // For ~34°N latitude, astronomical sunrise/set hours (UTC offset for IST ≈ +5.5)
  const riseSummerH  = 5.5;
  const riseWinterH  = 7.0;
  const setSummerH   = 19.5;
  const setWinterH   = 18.0;

  for (let month = 1; month <= 12; month++) {
    const mIdx    = month - 1;
    const Tmax    = monthlyMeanMaxC[mIdx];
    const Tmin    = monthlyMeanMinC[mIdx];
    const dniNoon = monthlyMeanDNI[mIdx];

    // Seasonal factor (0=winter, 1=summer)
    const seasonFac = Math.sin(Math.PI * (month - 3) / 12); // peaks Jun/Jul, trough Dec/Jan

    // Sunrise/sunset for this month (interpolated)
    const rise = riseWinterH  + (riseSummerH  - riseWinterH)  * Math.max(0, seasonFac);
    const set  = setWinterH   + (setSummerH   - setWinterH)   * Math.max(0, seasonFac);
    const dayLen = set - rise;

    for (let hour = 0; hour < 24; hour++) {
      // ── Temperature ─────────────────────────────────────────────────
      // Diurnal: coldest at 5am, warmest at 2pm (hour 14)
      const sinArg  = Math.PI * (hour - 5) / 12;
      const T_hour  = (Tmax + Tmin) / 2 + ((Tmax - Tmin) / 2) * Math.sin(sinArg);

      // ── DNI ─────────────────────────────────────────────────────────
      let dniHour = 0;
      if (hour > rise && hour < set) {
        // Sinusoidal arc over daylight window
        const solarArc = Math.sin(Math.PI * (hour - rise) / dayLen);
        // Add altitude boost: higher altitude → less atmospheric attenuation
        const altFactor = 1 + (altitude_m - 3500) / 10000;
        dniHour = Math.max(0, dniNoon * altFactor * solarArc);
      }

      // Add small wind speed estimate (m/s) — increases with altitude
      const windMs = 3.0 + (altitude_m - 3500) / 1000 + 2.0 * Math.max(0, -seasonFac);

      records.push({
        month,
        hour,
        meanAmbientC: Math.round(T_hour * 10) / 10,
        meanDNI_Wm2:  Math.round(dniHour * 10) / 10,
        meanWindMs:   Math.round(windMs  * 10) / 10,
      });
    }
  }

  return records;
}

// ─── Main seed function ───────────────────────────────────────────────────────

async function seed() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aerotwin_habitat';
  console.log(`\n🌱  AeroTwin-Habitat Weather Station Seed`);
  console.log(`📡  Connecting to: ${MONGO_URI}\n`);

  await mongoose.connect(MONGO_URI);

  for (const station of STATIONS) {
    const hourlyClimatology = generateClimatology(station);

    const result = await WeatherStation.findOneAndUpdate(
      { stationName: station.stationName },
      {
        stationName:       station.stationName,
        lat:               station.lat,
        lon:               station.lon,
        altitude_m:        station.altitude_m,
        hourlyClimatology,
      },
      { upsert: true, new: true }
    );

    console.log(`✅  ${station.stationName.padEnd(10)} | ${result.hourlyClimatology.length} records (12×24) | alt=${station.altitude_m}m`);
  }

  console.log(`\n🎉  Seed complete! ${STATIONS.length} stations seeded.`);
  console.log(`    ⚠️  Data is synthetic but physically plausible (air-gapped deployment mode)\n`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
