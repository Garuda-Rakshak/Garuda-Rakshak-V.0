'use strict';

/**
 * NSGA-II Optimizer Unit Tests — AeroTwin-Habitat
 *
 * Tests correctness of:
 *  1. Fast non-dominated sort (known Pareto fronts)
 *  2. Crowding distance (boundary = Infinity)
 *  3. Dominance check
 *  4. SBX crossover (offspring within bounds)
 *  5. Polynomial mutation (offspring within bounds)
 */

const {
  fastNonDominatedSort,
  crowdingDistance,
  dominates,
  sbxCrossover,
  polynomialMutation,
  initPopulation,
  BOUNDS,
  PARAM_KEYS,
} = require('../src/services/optimizer.service');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeInd(weightKg, thermalScore) {
  return {
    genes:        PARAM_KEYS.map(() => 0.1),
    fitness:      { weightKg, thermalScore },
    rank:         Infinity,
    crowdingDist: 0,
  };
}

// ─── Dominance tests ──────────────────────────────────────────────────────────

describe('dominates()', () => {
  it('A dominates B when A has better weight AND better thermal', () => {
    const a = { weightKg: 100, thermalScore: 80 };
    const b = { weightKg: 200, thermalScore: 60 };
    expect(dominates(a, b)).toBe(1);
    expect(dominates(b, a)).toBe(-1);
  });

  it('returns 0 when neither dominates (trade-off)', () => {
    const a = { weightKg: 100, thermalScore: 60 };
    const b = { weightKg: 200, thermalScore: 80 };
    expect(dominates(a, b)).toBe(0);
    expect(dominates(b, a)).toBe(0);
  });

  it('returns 0 for identical fitness', () => {
    const a = { weightKg: 100, thermalScore: 70 };
    expect(dominates(a, { ...a })).toBe(0);
  });
});

// ─── Non-dominated sort tests ─────────────────────────────────────────────────

describe('fastNonDominatedSort()', () => {
  it('correctly identifies 2 Pareto fronts in a hand-crafted population', () => {
    /**
     * Population:
     *   P0: (100kg, 90score) — Pareto front 1
     *   P1: (150kg, 95score) — Pareto front 1 (better thermal, worse weight → trade-off)
     *   P2: (200kg, 70score) — Dominated by P0 (P0 has lower weight AND higher thermal)
     *   P3: (250kg, 60score) — Dominated by P0 and P1
     */
    const pop = [
      makeInd(100, 90),  // P0 — rank 1
      makeInd(150, 95),  // P1 — rank 1 (trade-off with P0)
      makeInd(200, 70),  // P2 — dominated by P0 and P1 → rank 2
      makeInd(250, 85),  // P3 — dominated by P0 and P1 (but trade-off with P2) → rank 2
    ];

    const fronts = fastNonDominatedSort(pop);

    expect(fronts.length).toBeGreaterThanOrEqual(2);
    expect(fronts[0]).toHaveLength(2); // P0 and P1 both in front 1
    expect(fronts[1]).toHaveLength(2); // P2 and P3 in front 2

    // Check ranks assigned
    expect(pop[0].rank).toBe(1);
    expect(pop[1].rank).toBe(1);
    expect(pop[2].rank).toBe(2);
    expect(pop[3].rank).toBe(2);
  });

  it('single individual has rank 1', () => {
    const pop = [makeInd(100, 80)];
    const fronts = fastNonDominatedSort(pop);
    expect(fronts[0]).toContain(0);
    expect(pop[0].rank).toBe(1);
  });

  it('all dominated by one → correct front structure', () => {
    const pop = [
      makeInd(100, 90),  // dominates all below
      makeInd(200, 85),  // rank 2
      makeInd(300, 80),  // rank 3
    ];
    fastNonDominatedSort(pop);
    expect(pop[0].rank).toBe(1);
    expect(pop[1].rank).toBe(2);
    expect(pop[2].rank).toBe(3);
  });
});

// ─── Crowding distance tests ──────────────────────────────────────────────────

describe('crowdingDistance()', () => {
  it('boundary individuals get Infinity crowding distance', () => {
    const pop = [
      makeInd(100, 90),
      makeInd(150, 75),
      makeInd(200, 60),
    ];
    const frontIndices = [0, 1, 2];
    pop.forEach((p) => { p.rank = 1; });

    crowdingDistance(frontIndices, pop);

    expect(pop[0].crowdingDist).toBe(Infinity);
    expect(pop[2].crowdingDist).toBe(Infinity);
    expect(pop[1].crowdingDist).not.toBe(Infinity);
  });

  it('single-member front gets Infinity', () => {
    const pop = [makeInd(100, 90)];
    crowdingDistance([0], pop);
    expect(pop[0].crowdingDist).toBe(Infinity);
  });
});

// ─── Genetic operator tests ───────────────────────────────────────────────────

describe('sbxCrossover()', () => {
  it('offspring genes remain within bounds', () => {
    const p1 = PARAM_KEYS.map((k) => BOUNDS[k][0] + (BOUNDS[k][1] - BOUNDS[k][0]) * 0.2);
    const p2 = PARAM_KEYS.map((k) => BOUNDS[k][0] + (BOUNDS[k][1] - BOUNDS[k][0]) * 0.8);

    for (let i = 0; i < 20; i++) {
      const [c1, c2] = sbxCrossover(p1, p2);
      PARAM_KEYS.forEach((k, idx) => {
        const [lo, hi] = BOUNDS[k];
        expect(c1[idx]).toBeGreaterThanOrEqual(lo - 1e-9);
        expect(c1[idx]).toBeLessThanOrEqual(hi + 1e-9);
        expect(c2[idx]).toBeGreaterThanOrEqual(lo - 1e-9);
        expect(c2[idx]).toBeLessThanOrEqual(hi + 1e-9);
      });
    }
  });
});

describe('polynomialMutation()', () => {
  it('mutated genes remain within bounds', () => {
    const genes = PARAM_KEYS.map((k) => (BOUNDS[k][0] + BOUNDS[k][1]) / 2);

    for (let i = 0; i < 20; i++) {
      const mutated = polynomialMutation(genes, 20, 1.0); // pm=1 to force mutation
      PARAM_KEYS.forEach((k, idx) => {
        const [lo, hi] = BOUNDS[k];
        expect(mutated[idx]).toBeGreaterThanOrEqual(lo - 1e-9);
        expect(mutated[idx]).toBeLessThanOrEqual(hi + 1e-9);
      });
    }
  });
});

// ─── Population initialization ────────────────────────────────────────────────

describe('initPopulation()', () => {
  it('generates N individuals with correct gene count', () => {
    const pop = initPopulation(10);
    expect(pop).toHaveLength(10);
    pop.forEach((ind) => {
      expect(ind.genes).toHaveLength(PARAM_KEYS.length);
      expect(ind.fitness).toBeNull();
    });
  });

  it('all gene values within bounds', () => {
    const pop = initPopulation(50);
    pop.forEach((ind) => {
      PARAM_KEYS.forEach((k, idx) => {
        const [lo, hi] = BOUNDS[k];
        expect(ind.genes[idx]).toBeGreaterThanOrEqual(lo);
        expect(ind.genes[idx]).toBeLessThanOrEqual(hi);
      });
    });
  });
});
