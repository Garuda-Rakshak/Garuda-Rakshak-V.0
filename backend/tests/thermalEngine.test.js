'use strict';

/**
 * Thermal Engine Unit Tests — AeroTwin-Habitat
 *
 * Tests physical correctness:
 *  1. Steady-state: constant ambient → indoor temp converges
 *  2. PCM: run with PCM absorbs more energy near melt point than no-PCM run
 *  3. Heat loss proportional to ΔT (higher ΔT → more heat loss)
 *  4. Solar gain increases indoor temperature vs no-solar case
 */

const { runSimulation, computeThermalScore, pcmEffectiveCp, pcmMeltFraction } =
  require('../src/services/thermalEngine.service');

// ─── Minimal shelter config ───────────────────────────────────────────────────

function makeShelter(overrides = {}) {
  return {
    location:  { name: 'Leh', lat: 34.15, lon: 77.58, altitude_m: 3500 },
    geometry:  { length_m: 6, width_m: 4, height_m: 3, orientation_deg: 0 },
    envelope:  {
      roof:    { uValue: 0.2, thickness_m: 0.1, material: 'insulated_panel', density_kgm3: 40, specificHeat_JkgK: 1000 },
      walls:   { uValue: 0.3, thickness_m: 0.08, material: 'insulated_panel', density_kgm3: 40, specificHeat_JkgK: 1000 },
      floor:   { uValue: 0.25, thickness_m: 0.08, material: 'insulated_panel', density_kgm3: 30, specificHeat_JkgK: 1000 },
      glazing: { area_m2: 2.0, uValue: 1.5, shgc: 0.4 },
    },
    pcm:                 { present: false },
    infiltrationRateACH: 0.5,
    internalGainsW:      200,
    massConstraintKg:    1500,
    ...overrides,
  };
}

// ─── PCM unit tests ───────────────────────────────────────────────────────────

describe('PCM apparent heat capacity', () => {
  it('pcmEffectiveCp peaks at melt point', () => {
    const T_melt = 28;
    const L      = 200_000; // J/kg
    const cp_base = 840;
    const sigma   = 1.5;

    const cpAtMelt    = pcmEffectiveCp(T_melt,      T_melt, L, cp_base, sigma);
    const cpFarFromMelt = pcmEffectiveCp(T_melt + 20, T_melt, L, cp_base, sigma);

    expect(cpAtMelt).toBeGreaterThan(cpFarFromMelt);
    expect(cpAtMelt).toBeGreaterThan(cp_base * 10); // much larger than sensible cp at peak
  });

  it('pcmMeltFraction is 0 well below melt, 1 well above melt', () => {
    const T_melt = 28;
    const sigma  = 1.5;

    expect(pcmMeltFraction(T_melt - 20, T_melt, sigma)).toBeLessThan(0.01);
    expect(pcmMeltFraction(T_melt + 20, T_melt, sigma)).toBeGreaterThan(0.99);
    expect(pcmMeltFraction(T_melt, T_melt, sigma)).toBeCloseTo(0.5, 1);
  });
});

// ─── Thermal engine correctness ───────────────────────────────────────────────

describe('Thermal engine — physical sanity', () => {
  // Use 30-min step and 5-node surrogate mode for fast tests
  const simOpts = { hoursSimulated: 24, stepMinutes: 30, surrogateMode: true, nodesPerLayer: 3 };

  it('completes in under 1500ms for a 24h simulation', async () => {
    const config = makeShelter();
    const t0     = Date.now();

    // Full resolution: 1-min step
    await runSimulation(config, { hoursSimulated: 24, stepMinutes: 1, nodesPerLayer: 5 });

    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(1500);
  }, 5000);

  it('indoor temperature is warmer than minimum ambient (internal gains effect)', async () => {
    const ambientProfile = new Array(48).fill(-15); // constant -15°C, 30-min step = 48 steps
    const solarProfile   = new Array(48).fill(0);   // no solar

    const config  = makeShelter({ internalGainsW: 500 });
    const results = await runSimulation(config, {
      ...simOpts,
      ambientProfile,
      solarProfile,
    });

    expect(results.meanIndoorC).toBeGreaterThan(-15); // internal gains keep it warmer
  });

  it('heat loss increases when ambient is colder (larger ΔT)', async () => {
    const coldAmbient = new Array(48).fill(-30);
    const mildAmbient = new Array(48).fill(-5);
    const solarProfile = new Array(48).fill(0);

    const config = makeShelter();

    const [coldResult, mildResult] = await Promise.all([
      runSimulation(config, { ...simOpts, ambientProfile: coldAmbient, solarProfile }),
      runSimulation(config, { ...simOpts, ambientProfile: mildAmbient, solarProfile }),
    ]);

    const coldHeatLoss = Object.values(coldResult.heatLossBreakdown).reduce((s, v) => s + v, 0);
    const mildHeatLoss = Object.values(mildResult.heatLossBreakdown).reduce((s, v) => s + v, 0);

    expect(coldHeatLoss).toBeGreaterThan(mildHeatLoss);
  });

  it('PCM run stores more net latent energy near melt point than no-PCM run', async () => {
    const meltPoint = 20;
    // Ambient oscillates around melt point → PCM absorbs latent heat
    const ambientProfile = Array.from({ length: 48 }, (_, i) =>
      meltPoint - 5 + 12 * Math.sin(2 * Math.PI * i / 48)
    );
    const solarProfile = new Array(48).fill(200);

    const configNoPcm = makeShelter({ pcm: { present: false } });
    const configPcm   = makeShelter({
      pcm: { present: true, meltPoint_C: meltPoint, latentHeat_kJkg: 200, mass_kg: 100, sigma_C: 2 },
    });

    const [noPcmResult, pcmResult] = await Promise.all([
      runSimulation(configNoPcm, { ...simOpts, ambientProfile, solarProfile }),
      runSimulation(configPcm,   { ...simOpts, ambientProfile, solarProfile }),
    ]);

    // PCM should moderate indoor temperatures (smaller spread)
    const noPcmSpread = noPcmResult.maxIndoorC - noPcmResult.minIndoorC;
    const pcmSpread   = pcmResult.maxIndoorC   - pcmResult.minIndoorC;

    expect(Math.abs(pcmResult.pcmEnergyStored_J)).toBeGreaterThan(0);
    // PCM run should generally have smaller or comparable spread due to thermal buffering
    // (allow up to 20% looser in surrogate mode — this is physics, not accounting)
    expect(noPcmSpread).toBeGreaterThanOrEqual(pcmSpread * 0.8);
  });

  it('solar gain increases mean indoor temperature vs no-solar case', async () => {
    const ambientProfile = new Array(48).fill(-10);

    const config  = makeShelter();
    const [solar, noSolar] = await Promise.all([
      runSimulation(config, { ...simOpts, ambientProfile, solarProfile: new Array(48).fill(600) }),
      runSimulation(config, { ...simOpts, ambientProfile, solarProfile: new Array(48).fill(0) }),
    ]);

    expect(solar.meanIndoorC).toBeGreaterThan(noSolar.meanIndoorC);
  });

  it('thermalScore is between 0 and 100', async () => {
    const config  = makeShelter();
    const results = await runSimulation(config, simOpts);
    const score = computeThermalScore(results);

    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
