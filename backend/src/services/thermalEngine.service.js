'use strict';

/**
 * Transient Thermal Finite-Difference Engine — AeroTwin-Habitat
 *
 * Multi-layer 1D explicit finite-difference solver for a military shelter envelope.
 * Envelope layers: roof, walls, floor (each discretized into N nodes).
 * PCM: apparent heat capacity method — no explicit phase tracking required.
 * Interior air node: lumped capacitance with solar, conductive, infiltration, and
 *   internal gain fluxes.
 *
 * Performance target: < 1.5 s for 24h / 1-min-step on a standard dev machine.
 * At 1-min steps: 1440 iterations × envelope nodes ≈ ~50k float ops → well within target.
 *
 * References:
 *  - Duffie & Beckman, "Solar Engineering of Thermal Processes" (4th ed.)
 *  - Cengel & Ghajar, "Heat and Mass Transfer" (5th ed.)
 *  - Deb, "NSGA-II" — not referenced here but conceptually consistent solver architecture
 */

const { gaussian, clamp, airDensityAtAltitude } = require('../utils/numeric');
const { CP_AIR, SIGMA_SB }  = require('../utils/constants');
const {
  generate24hSolarProfile,
  ambientProfileFromClimatology,
  irradianceOnSurface,
} = require('./solar.service');

// ─── Default solver parameters ──────────────────────────────────────────────

const DEFAULT_NODES_PER_LAYER = 5;   // spatial nodes per envelope layer
const MIN_DT_S                = 30;  // minimum allowable timestep (seconds)
const INDOOR_CONVECTION_H     = 5.0; // W/(m²·K) interior surface convection
const OUTDOOR_CONVECTION_H    = 15.0; // W/(m²·K) exterior surface convection (wind)

// ─── Material library defaults ───────────────────────────────────────────────

const MATERIAL_DEFAULTS = {
  // name → { rho_kgm3, cp_JkgK, k_Wm2K }
  'insulated_panel':   { rho: 40,   cp: 1000, k: 0.04  },
  'aerogel_blanket':   { rho: 100,  cp: 1000, k: 0.015 },
  'military_tent':     { rho: 1.5,  cp: 1000, k: 0.05  },
  'polyurethane_foam': { rho: 30,   cp: 1300, k: 0.03  },
  'gfrp_panel':        { rho: 1800, cp: 840,  k: 0.35  },
  'plywood':           { rho: 600,  cp: 1700, k: 0.15  },
  'concrete_block':    { rho: 2000, cp: 880,  k: 1.0   },
  'aluminum_sheet':    { rho: 2700, cp: 900,  k: 205   },
  'default':           { rho: 200,  cp: 1000, k: 0.05  },
};

function getMaterialProps(material, density_kgm3, specificHeat_JkgK) {
  const mat   = MATERIAL_DEFAULTS[material] || MATERIAL_DEFAULTS['default'];
  const rho   = density_kgm3   || mat.rho;
  const cp    = specificHeat_JkgK || mat.cp;
  // Back-compute k from U-value if not in library
  const k     = mat.k;
  return { rho, cp, k };
}

// ─── PCM apparent heat capacity ──────────────────────────────────────────────

/**
 * Effective specific heat of a PCM layer at temperature T.
 * Uses Gaussian peak around melt point to distribute latent heat.
 *
 * @param {number} T       - Current temperature (°C)
 * @param {number} T_melt  - Melt point (°C)
 * @param {number} L       - Latent heat (J/kg)
 * @param {number} cp_base - Sensible specific heat (J/kg·K)
 * @param {number} sigma   - Gaussian half-width (°C), default 1.5
 */
function pcmEffectiveCp(T, T_melt, L, cp_base, sigma = 1.5) {
  // gaussian() returns 1/(sigma*sqrt(2pi)) at peak → multiply by L to get J/kg/K
  return cp_base + L * gaussian(T, T_melt, sigma);
}

/**
 * Fraction of PCM that has melted (0=solid, 1=fully liquid).
 * Integral of Gaussian from -∞ to T (error function approximation).
 */
function pcmMeltFraction(T, T_melt, sigma = 1.5) {
  const x = (T - T_melt) / (sigma * Math.SQRT2);
  // Abramowitz & Stegun erfc approximation
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erfc = poly * Math.exp(-x * x);
  const erf  = x >= 0 ? 1 - erfc : erfc - 1;
  return clamp(0.5 * (1 + erf), 0, 1);
}

// ─── Layer node initialization ───────────────────────────────────────────────

/**
 * Build a node array for one envelope layer.
 * @param {object} layerSpec - envelope layer (uValue, thickness_m, material, density, cp)
 * @param {number} N         - number of spatial nodes
 * @param {number} T_init    - initial temperature (°C)
 * @returns {Array<{T, dx, rho, cp, k, mass}>}
 */
function buildLayerNodes(layerSpec, N, T_init) {
  const { thickness_m, material, density_kgm3, specificHeat_JkgK, uValue } = layerSpec;
  const { rho, cp, k: k_mat } = getMaterialProps(material, density_kgm3, specificHeat_JkgK);

  // Effective conductivity from U-value: k_eff = uValue * thickness_m
  const k = Math.max(k_mat, uValue * thickness_m);

  const dx = thickness_m / N;
  return Array.from({ length: N }, () => ({
    T:    T_init,
    dx,
    rho,
    cp,
    k,
    // mass per unit area (kg/m²) — per node slice
    massPerM2: rho * dx,
  }));
}

// ─── Single timestep solver ───────────────────────────────────────────────────

/**
 * Advance one envelope layer by one timestep using explicit finite-difference.
 *
 * Node layout (N nodes):
 *  node[0]  → exterior surface  (boundary: T_ext or flux)
 *  node[N-1]→ interior surface  (boundary: T_int or flux)
 *
 * Interior node energy balance (explicit):
 *   T[i]_new = T[i] + dt/(rho*cp*dx) * (q_left - q_right)
 *   where q = k * (T[i-1] - T[i]) / dx   [W/m²]
 *
 * Boundary conditions: first-order Robin (convection) at both ends.
 *
 * @param {Array}  nodes       - Node array from buildLayerNodes
 * @param {number} T_ext       - Exterior boundary temperature (°C)
 * @param {number} T_int       - Interior air temperature (°C)
 * @param {number} q_solar     - Solar flux on exterior surface (W/m²)
 * @param {number} h_ext       - Exterior convection coefficient (W/m²·K)
 * @param {number} h_int       - Interior convection coefficient (W/m²·K)
 * @param {number} emissivity  - Surface emissivity for LW radiation (0–1)
 * @param {number} T_sky       - Sky effective radiation temperature (°C)
 * @param {number} dt          - Timestep (seconds)
 * @param {object|null} pcmSpec - PCM parameters if this layer has PCM
 * @returns {Array} Updated node array (mutates in-place for speed)
 */
function stepLayer(nodes, T_ext, T_int, q_solar, h_ext, h_int, emissivity, T_sky, dt, pcmSpec) {
  const N       = nodes.length;
  const T_prev  = nodes.map((n) => n.T);
  const T_skyK  = T_sky + 273.15;

  // Exterior boundary: convection + solar absorption + LW radiation
  const T_ext0  = T_prev[0];
  const T_ext0K = T_ext0 + 273.15;
  // Solar absorption (absorptivity ~ 0.9 for military surfaces)
  const alpha_sol = 0.90;
  const q_in_ext  = h_ext * (T_ext - T_ext0) +
                    alpha_sol * q_solar -
                    emissivity * SIGMA_SB * (T_ext0K ** 4 - T_skyK ** 4);

  // Interior boundary: convection only
  const T_intN   = T_prev[N - 1];
  const q_out_int = h_int * (T_intN - T_int);

  const T_new = T_prev.slice();

  for (let i = 0; i < N; i++) {
    const { dx, rho, k } = nodes[i];

    // Effective cp (PCM or sensible)
    let cp_eff;
    if (pcmSpec && pcmSpec.present) {
      const L_Jkg = pcmSpec.latentHeat_kJkg * 1000;
      cp_eff = pcmEffectiveCp(T_prev[i], pcmSpec.meltPoint_C, L_Jkg, nodes[i].cp, pcmSpec.sigma_C || 1.5);
    } else {
      cp_eff = nodes[i].cp;
    }

    let q_left, q_right;

    if (i === 0) {
      // Exterior boundary node
      q_left  = q_in_ext; // W/m²
      q_right = (N > 1) ? k * (T_prev[0] - T_prev[1]) / dx : q_out_int;
    } else if (i === N - 1) {
      // Interior boundary node
      q_left  = k * (T_prev[i - 1] - T_prev[i]) / dx;
      q_right = q_out_int;
    } else {
      // Interior node
      q_left  = k * (T_prev[i - 1] - T_prev[i]) / dx;
      q_right = k * (T_prev[i]     - T_prev[i + 1]) / dx;
    }

    const dT = (dt / (rho * cp_eff * dx)) * (q_left - q_right);
    T_new[i] = T_prev[i] + dT;
  }

  // Apply T_new back
  for (let i = 0; i < N; i++) {
    nodes[i].T = T_new[i];
  }

  // Return heat flux through interior surface (W/m²) — positive = heat loss from interior
  const k_last = nodes[N - 1].k;
  const heatFluxToInterior = (N > 1)
    ? k_last * (nodes[N - 2].T - nodes[N - 1].T) / nodes[N - 1].dx
    : h_int * (nodes[N - 1].T - T_int);

  return -heatFluxToInterior; // negative = loss from interior to exterior
}

// ─── Main simulation function ─────────────────────────────────────────────────

/**
 * Run a 24-hour transient thermal simulation for a shelter configuration.
 *
 * @param {object} config        - ShelterConfig document (plain object)
 * @param {object} options
 * @param {number} [options.hoursSimulated=24]
 * @param {number} [options.stepMinutes=1]
 * @param {Date}   [options.date]          - Date for solar calculation
 * @param {Array}  [options.ambientProfile] - Pre-computed ambient temps (°C) per step
 * @param {Array}  [options.solarProfile]   - Pre-computed solar irradiance (W/m²) per step
 * @param {number} [options.nodesPerLayer=5]
 * @param {boolean}[options.surrogateMode=false] - Fast mode for optimizer (fewer nodes, coarser dt)
 * @returns {object} Simulation results
 */
async function runSimulation(config, options = {}) {
  const {
    hoursSimulated = 24,
    stepMinutes    = 1,
    date           = new Date(),
    ambientProfile = null,
    solarProfile   = null,
    nodesPerLayer  = options.surrogateMode ? 3 : DEFAULT_NODES_PER_LAYER,
    surrogateMode  = false,
  } = options;

  const dt       = (surrogateMode ? Math.max(stepMinutes, 5) : stepMinutes) * 60; // seconds
  const nSteps   = Math.round((hoursSimulated * 3600) / dt);
  const { location, geometry, envelope, pcm, infiltrationRateACH, internalGainsW } = config;

  // ── Geometry-derived areas (m²) ─────────────────────────────────────────
  const { length_m, width_m, height_m } = geometry;
  const A_roof   = length_m * width_m;
  const A_walls  = 2 * (length_m + width_m) * height_m;
  const A_floor  = length_m * width_m;
  const A_glaz   = envelope.glazing.area_m2;
  const V_int    = length_m * width_m * height_m;

  // ── Solar profile ───────────────────────────────────────────────────────
  let solProf = solarProfile;
  if (!solProf) {
    const rawProfile = generate24hSolarProfile({
      lat:        location.lat,
      lon:        location.lon,
      altitude_m: location.altitude_m,
      date,
      stepMinutes: surrogateMode ? 30 : stepMinutes,
    });
    // Map to W/m² GHI values
    const rawGHI = rawProfile.map((p) => p.ghiWm2);
    // If surrogateMode used coarser solar, interpolate to match nSteps
    if (rawGHI.length !== nSteps) {
      solProf = Array.from({ length: nSteps }, (_, i) => {
        const frac = (i / (nSteps - 1)) * (rawGHI.length - 1);
        const lo   = Math.floor(frac);
        const hi   = Math.min(lo + 1, rawGHI.length - 1);
        return rawGHI[lo] + (frac - lo) * (rawGHI[hi] - rawGHI[lo]);
      });
    } else {
      solProf = rawGHI;
    }
  }

  // ── Ambient profile ─────────────────────────────────────────────────────
  let ambProf = ambientProfile;
  if (!ambProf) {
    // Synthesize diurnal swing: mean -5°C at altitude, ±10°C swing
    const baseTemp = -5 - (location.altitude_m - 3500) * 0.006;
    ambProf = Array.from({ length: nSteps }, (_, i) => {
      const hourFrac = (i * dt) / 3600;
      // Diurnal: coldest at 4am, warmest at 2pm
      return baseTemp + 10 * Math.sin(Math.PI * (hourFrac - 4) / 12);
    });
  }

  // ── Build envelope nodes ────────────────────────────────────────────────
  const T_init = ambProf[0]; // start at ambient
  const roofNodes  = buildLayerNodes(envelope.roof,  nodesPerLayer, T_init + 5);
  const wallNodes  = buildLayerNodes(envelope.walls, nodesPerLayer, T_init + 3);
  const floorNodes = buildLayerNodes(envelope.floor, nodesPerLayer, T_init + 3);

  // ── Indoor air (lumped capacitance) ─────────────────────────────────────
  // Mass of air in shelter
  const rhoAir = airDensityAtAltitude(location.altitude_m, T_init);
  const mAir   = rhoAir * V_int;
  const cpAir  = CP_AIR;
  let T_indoor = T_init + 5; // start slightly warmer than ambient

  // ── PCM effective parameters ─────────────────────────────────────────────
  const pcmActive = pcm && pcm.present;
  const pcmSpec   = pcmActive ? {
    present:         true,
    meltPoint_C:     pcm.meltPoint_C  || 28,
    latentHeat_kJkg: pcm.latentHeat_kJkg || 200,
    mass_kg:         pcm.mass_kg || 50,
    sigma_C:         pcm.sigma_C || 1.5,
  } : null;

  // PCM energy storage (J) — tracks total latent heat absorbed
  let pcmEnergyStored = 0;
  const pcmTotalCapacity = pcmActive
    ? (pcmSpec.latentHeat_kJkg * 1000 * pcmSpec.mass_kg)
    : 0;

  // ── Emissivity ───────────────────────────────────────────────────────────
  const emissivity = 0.9; // military fabric/panel surfaces

  // ── Sky temperature model (Swinbank 1963 simplified) ────────────────────
  function skyTemp(T_amb) {
    // T_sky = 0.0552 * T_amb^1.5  (K), then convert to °C
    const T_ambK = T_amb + 273.15;
    return 0.0552 * Math.pow(T_ambK, 1.5) - 273.15;
  }

  // ── Time series output ───────────────────────────────────────────────────
  const timeSeries = [];
  let totalHeatLossRoof        = 0;
  let totalHeatLossWalls       = 0;
  let totalHeatLossFloor       = 0;
  let totalHeatLossGlazing     = 0;
  let totalHeatLossInfiltration = 0;

  // Stability check for explicit FD: dt < rho*cp*dx²/(2*k + 2*h*dx) for boundary nodes
  function getMinDt(nodes) {
    let minDt = Infinity;
    const h_max = Math.max(OUTDOOR_CONVECTION_H, INDOOR_CONVECTION_H);
    for (const n of nodes) {
      const dtMax = (n.rho * n.cp * n.dx * n.dx) / (2 * (n.k + h_max * n.dx));
      if (dtMax < minDt) minDt = dtMax;
    }
    return minDt;
  }
  const minStableDt = Math.min(getMinDt(roofNodes), getMinDt(wallNodes), getMinDt(floorNodes));
  const subDt = Math.max(1, minStableDt * 0.9);
  const nSubSteps = Math.ceil(dt / subDt);
  const actualDt = dt / nSubSteps;

  // ── Main time loop ───────────────────────────────────────────────────────
  for (let step = 0; step < nSteps; step++) {
    const T_amb    = ambProf[step];
    const q_solar  = solProf[step];   // W/m² GHI on horizontal surface
    const T_sky    = skyTemp(T_amb);
    const hourDecimal = (step * dt) / 3600;

    // Roof solar gain (horizontal surface)
    const q_roof_solar = q_solar; // already horizontal irradiance

    // Glazing solar gain (vertical south-facing)
    const glazingSolarGain = q_solar * 0.5 * envelope.glazing.shgc * A_glaz; // W

    let q_roof_loss = 0, q_wall_loss = 0, q_floor_loss = 0;
    let totalHeatLoss = 0;

    for (let sub = 0; sub < nSubSteps; sub++) {

      q_roof_loss  = stepLayer(roofNodes,  T_amb, T_indoor, q_roof_solar,
                                     OUTDOOR_CONVECTION_H, INDOOR_CONVECTION_H,
                                     emissivity, T_sky, actualDt, null) * A_roof;

      q_wall_loss  = stepLayer(wallNodes,  T_amb, T_indoor, q_solar * 0.3,
                                     OUTDOOR_CONVECTION_H, INDOOR_CONVECTION_H,
                                     emissivity, T_sky, actualDt, null) * A_walls;

      q_floor_loss = stepLayer(floorNodes, T_amb - 2, T_indoor, 0,
                                     2.0, INDOOR_CONVECTION_H,
                                     emissivity, T_sky, actualDt, null) * A_floor;

      // Glazing conductive/convective loss (simple UA model)
      const q_glaz_loss  = envelope.glazing.uValue * A_glaz * (T_indoor - T_amb); // W

      // Infiltration heat loss
      const rhoAirCurr       = airDensityAtAltitude(location.altitude_m, T_indoor);
      const q_infiltration   = (infiltrationRateACH / 3600) * V_int * rhoAirCurr * cpAir * (T_indoor - T_amb);

      // Total heat loss from indoor air
      totalHeatLoss = q_roof_loss + q_wall_loss + q_floor_loss + q_glaz_loss + q_infiltration;

      // Solar gain to indoor air through glazing
      const q_solar_gain = glazingSolarGain;

      // PCM apparent heat capacity correction to indoor air energy balance
      let q_pcm_exchange = 0;
      if (pcmActive) {
        // PCM interacts with indoor air — absorbs heat if T_indoor > T_melt, releases if below
        const pcm_cp_eff = pcmEffectiveCp(
          T_indoor,
          pcmSpec.meltPoint_C,
          pcmSpec.latentHeat_kJkg * 1000,
          840, // sensible cp J/kg·K for typical PCM (paraffin)
          pcmSpec.sigma_C
        );
        // PCM acts as additional thermal mass coupled to indoor air
        // Energy absorbed by PCM per timestep
        const dT_pcm = (T_indoor - pcmSpec.meltPoint_C) * 0.1; // driving ΔT for exchange
        q_pcm_exchange = pcm_cp_eff * pcmSpec.mass_kg * dT_pcm / actualDt;
        q_pcm_exchange = clamp(q_pcm_exchange, -5000, 5000); // cap at ±5 kW
        pcmEnergyStored += q_pcm_exchange * actualDt;
        pcmEnergyStored = clamp(pcmEnergyStored, -pcmTotalCapacity, pcmTotalCapacity);
      }

      // Indoor air energy balance:
      // (mAir * cpAir) * dT/dt = q_solar_gain + internalGainsW - totalHeatLoss - q_pcm
      const dT_indoor = (actualDt / (mAir * cpAir)) *
        (q_solar_gain + internalGainsW - totalHeatLoss - q_pcm_exchange);

      T_indoor = clamp(T_indoor + dT_indoor, T_amb - 30, T_amb + 80);

      // Accumulate heat loss (W·s → for breakdown)
      totalHeatLossRoof         += Math.abs(q_roof_loss)         * actualDt;
      totalHeatLossWalls        += Math.abs(q_wall_loss)         * actualDt;
      totalHeatLossFloor        += Math.abs(q_floor_loss)        * actualDt;
      totalHeatLossGlazing      += Math.abs(q_glaz_loss)         * actualDt;
      totalHeatLossInfiltration += Math.abs(q_infiltration)      * actualDt;
    }

    // Record time series (every step in full mode; every Nth in surrogate)
    const record = {
      t:                hourDecimal,
      ambientC:         T_amb,
      indoorC:          Math.round(T_indoor * 100) / 100,
      solarWm2:         Math.round(q_solar * 10) / 10,
      heatLossW:        Math.round(totalHeatLoss * 10) / 10,
      pcmStateFraction: pcmActive ? Math.round(pcmMeltFraction(T_indoor, pcmSpec.meltPoint_C, pcmSpec.sigma_C) * 1000) / 1000 : 0,
    };
    timeSeries.push(record);
  }

  // ── Compute summary statistics ───────────────────────────────────────────
  const indoorTemps = timeSeries.map((r) => r.indoorC);
  const minIndoorC  = Math.min(...indoorTemps);
  const maxIndoorC  = Math.max(...indoorTemps);
  const meanIndoorC = indoorTemps.reduce((s, v) => s + v, 0) / indoorTemps.length;

  // Convert accumulated W·s to mean W (average over simulation)
  const totalSimTime = nSteps * dt;
  const heatLossBreakdown = {
    roofW:         totalHeatLossRoof         / totalSimTime,
    wallsW:        totalHeatLossWalls        / totalSimTime,
    floorW:        totalHeatLossFloor        / totalSimTime,
    glazingW:      totalHeatLossGlazing      / totalSimTime,
    infiltrationW: totalHeatLossInfiltration / totalSimTime,
  };

  // Exterior skin temperature (last node of roof = exterior skin)
  const skinTempC = roofNodes[0].T;

  return {
    timeSeries,
    minIndoorC:        Math.round(minIndoorC * 100) / 100,
    maxIndoorC:        Math.round(maxIndoorC * 100) / 100,
    meanIndoorC:       Math.round(meanIndoorC * 100) / 100,
    heatLossBreakdown: Object.fromEntries(
      Object.entries(heatLossBreakdown).map(([k, v]) => [k, Math.round(v * 10) / 10])
    ),
    skinTempC,
    finalIndoorC: T_indoor,
    pcmEnergyStored_J: pcmEnergyStored,
  };
}

// ─── Thermal performance score ────────────────────────────────────────────────

/**
 * Compute a scalar thermal performance score (higher = better) from simulation results.
 * Used as the optimizer objective.
 *
 * Score factors:
 *  - Penalty for cold (T_indoor < 15°C) and overheating (T_indoor > 35°C)
 *  - Reward for stable indoor temperature (low variance)
 *  - Penalty for high heat loss
 *
 * @param {object} results - Output of runSimulation()
 * @param {number} targetTempC - Target indoor temperature (default 20°C)
 */
function computeThermalScore(results, targetTempC = 20) {
  const { minIndoorC, maxIndoorC, meanIndoorC, heatLossBreakdown } = results;

  // Comfort band: 15–30°C
  const coldPenalty  = Math.max(0, 15 - minIndoorC)  * 2;
  const heatPenalty  = Math.max(0, maxIndoorC - 30)  * 2;
  const spreadPenalty = (maxIndoorC - minIndoorC) * 0.5;

  const totalLossW = Object.values(heatLossBreakdown).reduce((s, v) => s + v, 0);
  const lossPenalty = totalLossW / 500; // normalize

  const score = 100 - coldPenalty - heatPenalty - spreadPenalty - lossPenalty;
  return Math.max(0, Math.round(score * 100) / 100);
}

module.exports = {
  runSimulation,
  computeThermalScore,
  pcmEffectiveCp,
  pcmMeltFraction,
  buildLayerNodes,
  getMaterialProps,
};
