'use strict';

/**
 * Solar Service Unit Tests — AeroTwin-Habitat
 *
 * Tests:
 *  1. Summer solstice at Leh → peak DNI > 800 W/m² at noon, 0 at night
 *  2. Day of year calculation
 *  3. Solar declination bounds
 *  4. 24h profile has correct structure
 *  5. Altitude correction: higher altitude → higher DNI
 */

const {
  generate24hSolarProfile,
  clearSkyDNI,
  solarDeclination,
  dayOfYear,
  extraterrestrialRadiation,
} = require('../src/services/solar.service');

describe('dayOfYear()', () => {
  it('Jan 1 = day 1', () => {
    expect(dayOfYear(new Date('2024-01-01'))).toBe(1);
  });

  it('Jun 21 ≈ day 172–173', () => {
    const doy = dayOfYear(new Date('2024-06-21'));
    expect(doy).toBeGreaterThanOrEqual(171);
    expect(doy).toBeLessThanOrEqual(174);
  });
});

describe('solarDeclination()', () => {
  it('summer solstice declination ≈ +23.45°', () => {
    // DOY ≈ 172 for June 21
    const decRad = solarDeclination(172);
    const decDeg = (decRad * 180) / Math.PI;
    expect(decDeg).toBeGreaterThan(22);
    expect(decDeg).toBeLessThan(25);
  });

  it('winter solstice declination ≈ -23.45°', () => {
    const decRad = solarDeclination(355); // Dec 21
    const decDeg = (decRad * 180) / Math.PI;
    expect(decDeg).toBeLessThan(-21);
    expect(decDeg).toBeGreaterThan(-25);
  });

  it('equinox declination ≈ 0°', () => {
    const decRad = solarDeclination(80); // ~March 21
    const decDeg = (decRad * 180) / Math.PI;
    expect(Math.abs(decDeg)).toBeLessThan(3);
  });
});

describe('clearSkyDNI()', () => {
  it('returns 0 when solar altitude <= 0', () => {
    expect(clearSkyDNI(-5, 3500, 172)).toBe(0);
    expect(clearSkyDNI(0,  3500, 172)).toBe(0);
  });

  it('returns positive value for solar altitude 45° at Leh altitude', () => {
    const dni = clearSkyDNI(45, 3500, 172);
    expect(dni).toBeGreaterThan(0);
    expect(dni).toBeLessThan(1400); // less than solar constant
  });

  it('higher altitude → higher DNI (less atmosphere to absorb)', () => {
    const dniLow  = clearSkyDNI(60, 0,    172);
    const dniHigh = clearSkyDNI(60, 5500, 172);
    expect(dniHigh).toBeGreaterThan(dniLow);
  });
});

describe('generate24hSolarProfile()', () => {
  const LEH_PARAMS = {
    lat:        34.15,
    lon:        77.58,
    altitude_m: 3500,
    date:       new Date('2024-06-21'), // summer solstice
    stepMinutes: 60,
  };

  it('returns 24 hourly records', () => {
    const profile = generate24hSolarProfile(LEH_PARAMS);
    expect(profile).toHaveLength(24);
  });

  it('each record has required fields', () => {
    const profile = generate24hSolarProfile(LEH_PARAMS);
    profile.forEach((p) => {
      expect(p).toHaveProperty('hourDecimal');
      expect(p).toHaveProperty('solarAltDeg');
      expect(p).toHaveProperty('dniWm2');
      expect(p).toHaveProperty('ghiWm2');
      expect(p).toHaveProperty('dhiWm2');
    });
  });

  it('peak DNI at summer solstice at Leh altitude > 800 W/m²', () => {
    const profile = generate24hSolarProfile(LEH_PARAMS);
    const maxDni  = Math.max(...profile.map((p) => p.dniWm2));
    expect(maxDni).toBeGreaterThan(800);
  });

  it('DNI is 0 at night (00:00 and 23:00)', () => {
    const profile  = generate24hSolarProfile(LEH_PARAMS);
    const midnight = profile.find((p) => Math.round(p.hourDecimal) === 0);
    const lateNight= profile.find((p) => Math.round(p.hourDecimal) === 23);
    expect(midnight?.dniWm2 ?? 0).toBe(0);
    expect(lateNight?.dniWm2 ?? 0).toBe(0);
  });

  it('winter solstice has lower peak GHI than summer solstice at same location', () => {
    const summerProfile = generate24hSolarProfile({ ...LEH_PARAMS, date: new Date('2024-06-21') });
    const winterProfile = generate24hSolarProfile({ ...LEH_PARAMS, date: new Date('2024-12-21') });
    const summerMax = Math.max(...summerProfile.map((p) => p.ghiWm2));
    const winterMax = Math.max(...winterProfile.map((p) => p.ghiWm2));
    expect(summerMax).toBeGreaterThan(winterMax);
  });

  it('Siachen (5500m) peak DNI > Leh (3500m) peak DNI', () => {
    const lehProfile     = generate24hSolarProfile({ ...LEH_PARAMS, altitude_m: 3500 });
    const siachenProfile = generate24hSolarProfile({ ...LEH_PARAMS, altitude_m: 5500 });
    const lehMax     = Math.max(...lehProfile.map((p) => p.dniWm2));
    const siachenMax = Math.max(...siachenProfile.map((p) => p.dniWm2));
    expect(siachenMax).toBeGreaterThan(lehMax);
  });
});
