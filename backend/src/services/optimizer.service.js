'use strict';

/**
 * NSGA-II Multi-Objective Genetic Optimizer — AeroTwin-Habitat
 *
 * Objectives:
 *   f1: Minimize total shelter mass (kg)
 *   f2: Maximize thermal performance score (higher = better, so minimize -score)
 *
 * Algorithm: Deb et al. (2002) "A Fast and Elitist Multiobjective Genetic Algorithm: NSGA-II"
 *
 * IMPORTANT: This file is designed to run both:
 *  (a) as a standalone module (for direct calls and unit tests), and
 *  (b) as a worker_thread (spawned by the optimize controller).
 *
 * When running as worker_thread, it communicates progress via parentPort.postMessage().
 */

const { runSimulation, computeThermalScore } = require('./thermalEngine.service');
const { clamp, randFloat, randInt }           = require('../utils/numeric');

// ─── Design variable bounds ───────────────────────────────────────────────────
// Each individual is a vector of numeric parameters that get decoded into a ShelterConfig

const BOUNDS = {
  // Roof insulation thickness (m)
  roofThickness:   [0.05, 0.30],
  // Wall insulation thickness (m)
  wallThickness:   [0.03, 0.20],
  // Floor insulation thickness (m)
  floorThickness:  [0.03, 0.15],
  // Glazing area (m²)
  glazingArea:     [0.5, 6.0],
  // Glazing SHGC
  shgc:            [0.1, 0.8],
  // Infiltration rate (ACH)
  infiltration:    [0.1, 2.0],
  // PCM mass (kg), 0 means no PCM
  pcmMass:         [0, 150],
  // PCM melt point (°C)
  pcmMeltPoint:    [5, 35],
};

const PARAM_KEYS = Object.keys(BOUNDS);
const N_PARAMS   = PARAM_KEYS.length;

// ─── Encoding / decoding ──────────────────────────────────────────────────────

/**
 * Decode a real-valued gene vector into a partial ShelterConfig override.
 * The baseConfig provides geometry/location; genes override envelope/PCM.
 */
function decodeIndividual(genes, baseConfig) {
  const g = {};
  PARAM_KEYS.forEach((k, i) => { g[k] = genes[i]; });

  const densityRoof  = baseConfig.envelope.roof.density_kgm3   || 40;
  const densityWalls = baseConfig.envelope.walls.density_kgm3  || 40;
  const densityFloor = baseConfig.envelope.floor.density_kgm3  || 30;

  return {
    ...baseConfig,
    envelope: {
      roof: {
        ...baseConfig.envelope.roof,
        thickness_m: g.roofThickness,
        uValue:      baseConfig.envelope.roof.uValue || 0.2,
      },
      walls: {
        ...baseConfig.envelope.walls,
        thickness_m: g.wallThickness,
        uValue:      baseConfig.envelope.walls.uValue || 0.3,
      },
      floor: {
        ...baseConfig.envelope.floor,
        thickness_m: g.floorThickness,
        uValue:      baseConfig.envelope.floor.uValue || 0.25,
      },
      glazing: {
        ...baseConfig.envelope.glazing,
        area_m2: g.glazingArea,
        shgc:    g.shgc,
      },
    },
    pcm: {
      present:         g.pcmMass > 5,
      meltPoint_C:     g.pcmMeltPoint,
      latentHeat_kJkg: baseConfig.pcm ? baseConfig.pcm.latentHeat_kJkg || 200 : 200,
      mass_kg:         g.pcmMass,
      sigma_C:         1.5,
    },
    infiltrationRateACH: g.infiltration,
    // Compute mass from gene params
    _massKg: computeMass(baseConfig, g, densityRoof, densityWalls, densityFloor),
  };
}

/**
 * Estimate total shelter mass (kg) from design genes.
 */
function computeMass(baseConfig, g, densityRoof = 40, densityWalls = 40, densityFloor = 30) {
  const { length_m, width_m, height_m } = baseConfig.geometry;
  const A_roof  = length_m * width_m;
  const A_walls = 2 * (length_m + width_m) * height_m;
  const A_floor = length_m * width_m;

  const massRoof  = A_roof  * g.roofThickness  * densityRoof;
  const massWalls = A_walls * g.wallThickness   * densityWalls;
  const massFloor = A_floor * g.floorThickness  * densityFloor;
  const massPCM   = g.pcmMass;

  // Frame/structure estimate: 20% overhead
  const structuralMass = (massRoof + massWalls + massFloor) * 0.20;
  return massRoof + massWalls + massFloor + massPCM + structuralMass;
}

// ─── Population initialization ────────────────────────────────────────────────

function initPopulation(N) {
  return Array.from({ length: N }, () => ({
    genes:    PARAM_KEYS.map((k) => randFloat(BOUNDS[k][0], BOUNDS[k][1])),
    fitness:  null, // { weightKg, thermalScore }
    rank:     Infinity,
    crowdingDist: 0,
  }));
}

// ─── Evaluation ──────────────────────────────────────────────────────────────

/**
 * Evaluate a single individual's objectives.
 * Runs the thermal engine in surrogate mode for speed.
 * Returns { weightKg, thermalScore }.
 */
async function evaluateIndividual(individual, baseConfig) {
  const decoded = decodeIndividual(individual.genes, baseConfig);

  let thermalScore = 0;
  try {
    const results = await runSimulation(decoded, {
      hoursSimulated: 24,
      stepMinutes:    5,    // 5-min step in surrogate mode for speed
      surrogateMode:  true,
      nodesPerLayer:  3,
    });
    thermalScore = computeThermalScore(results);
  } catch (_err) {
    thermalScore = 0;
  }

  const weightKg = decoded._massKg;
  return { weightKg, thermalScore, minIndoorC: 0, maxIndoorC: 0 };
}

/**
 * Evaluate entire population (sequential — runs in worker thread).
 */
async function evaluatePopulation(population, baseConfig) {
  for (const ind of population) {
    if (!ind.fitness) {
      ind.fitness = await evaluateIndividual(ind, baseConfig);
    }
  }
}

// ─── NSGA-II core: fast non-dominated sorting ────────────────────────────────

/**
 * Fast non-dominated sort (Deb 2002, Algorithm 1).
 * Objectives: minimize weightKg, minimize (-thermalScore).
 * Returns fronts[] where fronts[0] = Pareto front.
 */
function fastNonDominatedSort(population) {
  const n     = population.length;
  const S     = Array.from({ length: n }, () => []);  // dominated set
  const count = new Array(n).fill(0);                  // domination count
  const rank  = new Array(n).fill(0);
  const fronts = [[]];

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const dom = dominates(population[i].fitness, population[j].fitness);
      if (dom === 1) {
        S[i].push(j);
      } else if (dom === -1) {
        count[i]++;
      }
    }
    if (count[i] === 0) {
      rank[i] = 1;
      fronts[0].push(i);
    }
  }

  let frontIdx = 0;
  while (frontIdx < fronts.length && fronts[frontIdx].length > 0) {
    const nextFront = [];
    for (const i of fronts[frontIdx]) {
      for (const j of S[i]) {
        count[j]--;
        if (count[j] === 0) {
          rank[j] = frontIdx + 2;
          nextFront.push(j);
        }
      }
    }
    frontIdx++;
    if (nextFront.length > 0) fronts.push(nextFront);
  }

  // Assign ranks
  fronts.forEach((front, r) => {
    front.forEach((i) => { population[i].rank = r + 1; });
  });

  return fronts;
}

/**
 * Domination check for bi-objective (min weightKg, max thermalScore).
 * Returns:
 *   1  if a dominates b
 *  -1  if b dominates a
 *   0  if neither dominates
 */
function dominates(fitnessA, fitnessB) {
  if (!fitnessA || !fitnessB) return 0;
  // Minimize weightKg, maximize thermalScore (convert to minimize -thermalScore)
  const a = [fitnessA.weightKg, -fitnessA.thermalScore];
  const b = [fitnessB.weightKg, -fitnessB.thermalScore];

  const aLeB  = a.every((v, i) => v <= b[i]);
  const aLtB  = a.some( (v, i) => v <  b[i]);
  const bLeA  = b.every((v, i) => v <= a[i]);
  const bLtA  = b.some( (v, i) => v <  a[i]);

  if (aLeB && aLtB) return  1;
  if (bLeA && bLtA) return -1;
  return 0;
}

// ─── Crowding distance ────────────────────────────────────────────────────────

/**
 * Compute crowding distance for individuals in a single front.
 * @param {Array<number>} frontIndices - Indices into population
 * @param {Array} population
 */
function crowdingDistance(frontIndices, population) {
  const len = frontIndices.length;
  if (len <= 2) {
    frontIndices.forEach((i) => { population[i].crowdingDist = Infinity; });
    return;
  }

  frontIndices.forEach((i) => { population[i].crowdingDist = 0; });

  // For each objective
  const objectives = ['weightKg', 'negThermal'];
  const extractors = {
    weightKg:   (f) => f.weightKg,
    negThermal: (f) => -f.thermalScore,
  };

  for (const obj of objectives) {
    const sorted = [...frontIndices].sort(
      (a, b) => extractors[obj](population[a].fitness) - extractors[obj](population[b].fitness)
    );
    const fMin = extractors[obj](population[sorted[0]].fitness);
    const fMax = extractors[obj](population[sorted[sorted.length - 1]].fitness);
    const range = fMax - fMin || 1e-9;

    population[sorted[0]].crowdingDist          = Infinity;
    population[sorted[sorted.length - 1]].crowdingDist = Infinity;

    for (let i = 1; i < sorted.length - 1; i++) {
      const prev = extractors[obj](population[sorted[i - 1]].fitness);
      const next = extractors[obj](population[sorted[i + 1]].fitness);
      population[sorted[i]].crowdingDist += (next - prev) / range;
    }
  }
}

// ─── Selection ────────────────────────────────────────────────────────────────

/**
 * Binary tournament selection: pick 2 random individuals, return the better one.
 * Better = lower rank; if same rank, higher crowding distance.
 */
function tournamentSelect(population) {
  const a = population[randInt(0, population.length - 1)];
  const b = population[randInt(0, population.length - 1)];

  if (a.rank < b.rank) return a;
  if (b.rank < a.rank) return b;
  if (a.crowdingDist > b.crowdingDist) return a;
  return b;
}

// ─── Genetic operators ────────────────────────────────────────────────────────

/**
 * Simulated Binary Crossover (SBX) — Deb & Agrawal (1995).
 * @param {Array<number>} p1Genes
 * @param {Array<number>} p2Genes
 * @param {number} eta  - Distribution index (default 20)
 * @returns {[Array, Array]} Two child gene arrays
 */
function sbxCrossover(p1Genes, p2Genes, eta = 20) {
  const c1 = [...p1Genes];
  const c2 = [...p2Genes];

  for (let i = 0; i < N_PARAMS; i++) {
    if (Math.random() > 0.5) continue; // 50% per-variable crossover

    const [lo, hi] = BOUNDS[PARAM_KEYS[i]];
    const x1 = Math.min(p1Genes[i], p2Genes[i]);
    const x2 = Math.max(p1Genes[i], p2Genes[i]);

    if (Math.abs(x2 - x1) < 1e-14) continue;

    const u    = Math.random();
    let beta;

    const beta_q = (u) => {
      if (u <= 0.5) {
        return Math.pow(2 * u, 1 / (eta + 1));
      }
      return Math.pow(1 / (2 * (1 - u)), 1 / (eta + 1));
    };

    beta = beta_q(u);

    c1[i] = clamp(0.5 * ((x1 + x2) - beta * (x2 - x1)), lo, hi);
    c2[i] = clamp(0.5 * ((x1 + x2) + beta * (x2 - x1)), lo, hi);
  }

  return [c1, c2];
}

/**
 * Polynomial mutation — Deb & Goyal (1996).
 * @param {Array<number>} genes
 * @param {number} eta_m - Mutation distribution index (default 20)
 * @param {number} pm    - Mutation probability per gene (default 1/N_PARAMS)
 * @returns {Array<number>}
 */
function polynomialMutation(genes, eta_m = 20, pm = null) {
  const mutProb = pm !== null ? pm : 1 / N_PARAMS;
  const result  = [...genes];

  for (let i = 0; i < N_PARAMS; i++) {
    if (Math.random() > mutProb) continue;

    const [lo, hi] = BOUNDS[PARAM_KEYS[i]];
    const x     = genes[i];
    const u     = Math.random();
    let delta;

    if (u < 0.5) {
      const b = 2 * u + (1 - 2 * u) * Math.pow(1 - (x - lo) / (hi - lo), eta_m + 1);
      delta   = Math.pow(b, 1 / (eta_m + 1)) - 1;
    } else {
      const b = 2 * (1 - u) + (2 * u - 1) * Math.pow(1 - (hi - x) / (hi - lo), eta_m + 1);
      delta   = 1 - Math.pow(b, 1 / (eta_m + 1));
    }

    result[i] = clamp(x + delta * (hi - lo), lo, hi);
  }

  return result;
}

// ─── Main NSGA-II loop ────────────────────────────────────────────────────────

/**
 * Run NSGA-II optimization.
 *
 * @param {object} baseConfig      - ShelterConfig plain object
 * @param {object} opts
 * @param {number} opts.generations    - Number of generations (default 20)
 * @param {number} opts.populationSize - Population size N (default 40)
 * @param {Function} opts.onProgress  - Callback({ generation, bestFitness, percent, log })
 * @returns {Promise<{paretoFront: Array, generationLog: Array}>}
 */
async function runOptimization(baseConfig, opts = {}) {
  const {
    generations    = 20,
    populationSize = 40,
    onProgress     = null,
  } = opts;

  // ── Initialize ─────────────────────────────────────────────────────────
  let population = initPopulation(populationSize);
  await evaluatePopulation(population, baseConfig);

  const generationLog = [];

  // ── Initial sort ───────────────────────────────────────────────────────
  let fronts = fastNonDominatedSort(population);
  fronts.forEach((front) => crowdingDistance(front, population));

  // ── Generation loop ────────────────────────────────────────────────────
  for (let gen = 1; gen <= generations; gen++) {
    // ── Generate offspring ───────────────────────────────────────────────
    const offspring = [];
    while (offspring.length < populationSize) {
      const p1 = tournamentSelect(population);
      const p2 = tournamentSelect(population);
      const [c1genes, c2genes] = sbxCrossover(p1.genes, p2.genes);
      offspring.push(
        { genes: polynomialMutation(c1genes), fitness: null, rank: Infinity, crowdingDist: 0 },
        { genes: polynomialMutation(c2genes), fitness: null, rank: Infinity, crowdingDist: 0 }
      );
    }

    // ── Evaluate offspring ───────────────────────────────────────────────
    await evaluatePopulation(offspring, baseConfig);

    // ── Combine parent + offspring ───────────────────────────────────────
    const combined = [...population, ...offspring];
    const combFronts = fastNonDominatedSort(combined);
    combFronts.forEach((front) => crowdingDistance(front, combined));

    // ── Select next generation (elitist) ────────────────────────────────
    const nextPop = [];
    for (const front of combFronts) {
      if (nextPop.length + front.length <= populationSize) {
        front.forEach((i) => nextPop.push(combined[i]));
      } else {
        // Fill remaining slots by crowding distance (descending)
        const remaining = populationSize - nextPop.length;
        const sortedFront = [...front].sort(
          (a, b) => combined[b].crowdingDist - combined[a].crowdingDist
        );
        sortedFront.slice(0, remaining).forEach((i) => nextPop.push(combined[i]));
        break;
      }
    }

    population = nextPop;

    // Re-sort for next generation
    fronts = fastNonDominatedSort(population);
    fronts.forEach((front) => crowdingDistance(front, population));

    // ── Generation statistics ────────────────────────────────────────────
    const paretoCandidates = fronts[0].map((i) => population[i]);
    const bestWeight  = Math.min(...paretoCandidates.map((p) => p.fitness.weightKg));
    const bestThermal = Math.max(...paretoCandidates.map((p) => p.fitness.thermalScore));

    const logEntry = {
      generation:  gen,
      bestWeight:  Math.round(bestWeight * 10) / 10,
      bestThermal: Math.round(bestThermal * 100) / 100,
      frontSize:   paretoCandidates.length,
    };
    generationLog.push(logEntry);

    if (onProgress) {
      await onProgress({
        generation:  gen,
        bestFitness: { weightKg: bestWeight, thermalScore: bestThermal },
        percent:     Math.round((gen / generations) * 100),
        log:         logEntry,
      });
    }
  }

  // ── Build final Pareto front ───────────────────────────────────────────
  const finalFronts = fastNonDominatedSort(population);
  const paretoFront = finalFronts[0].map((i) => {
    const ind     = population[i];
    const decoded = decodeIndividual(ind.genes, baseConfig);
    return {
      candidateConfig: {
        envelope:            decoded.envelope,
        pcm:                 decoded.pcm,
        infiltrationRateACH: decoded.infiltrationRateACH,
        geometry:            decoded.geometry,
      },
      fitness: {
        weightKg:     Math.round(ind.fitness.weightKg     * 10)  / 10,
        thermalScore: Math.round(ind.fitness.thermalScore * 100) / 100,
      },
      rank:         ind.rank,
      crowdingDist: Math.round(ind.crowdingDist * 1000) / 1000,
    };
  });

  return { paretoFront, generationLog };
}

module.exports = {
  runOptimization,
  fastNonDominatedSort,
  crowdingDistance,
  dominates,
  sbxCrossover,
  polynomialMutation,
  tournamentSelect,
  initPopulation,
  evaluateIndividual,
  decodeIndividual,
  computeMass,
  BOUNDS,
  PARAM_KEYS,
};
