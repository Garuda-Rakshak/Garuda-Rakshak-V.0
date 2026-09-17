'use strict';

/**
 * Logistics Audit Service — AeroTwin-Habitat
 *
 * Checks total shelter mass and volume against:
 *   - Mi-17 helicopter payload/volume limits
 *   - ALS (Ashok Leyland Stallion) truck payload/volume limits
 * and generates packing feasibility notes.
 */

const {
  MI17_PAYLOAD_KG,
  MI17_VOLUME_M3,
  ALS_PAYLOAD_KG,
  ALS_VOLUME_M3,
} = require('../utils/constants');

// ─── Material density database (kg/m³) for mass estimation ──────────────────

const MATERIAL_DENSITY = {
  'insulated_panel':   40,
  'aerogel_blanket':   100,
  'military_tent':     1.5,  // fabric kg/m² treated as volumetric
  'polyurethane_foam': 30,
  'gfrp_panel':        1800,
  'plywood':           600,
  'concrete_block':    2000,
  'aluminum_sheet':    2700,
  'default':           200,
};

/**
 * Get material density (kg/m³).
 */
function getMaterialDensity(material, overrideDensity = null) {
  if (overrideDensity && overrideDensity > 0) return overrideDensity;
  return MATERIAL_DENSITY[material] || MATERIAL_DENSITY['default'];
}

// ─── Mass computation ─────────────────────────────────────────────────────────

/**
 * Compute total shelter mass from ShelterConfig.
 * @param {object} config - ShelterConfig plain object
 * @returns {object} { breakdown, totalMassKg }
 */
function computeShelterMass(config) {
  const { geometry, envelope, pcm, internalGainsW } = config;
  const { length_m, width_m, height_m } = geometry;

  // Surface areas
  const A_roof  = length_m * width_m;
  const A_walls = 2 * (length_m + width_m) * height_m;
  const A_floor = length_m * width_m;

  // Mass = area × thickness × density
  const rhoRoof  = getMaterialDensity(envelope.roof.material,  envelope.roof.density_kgm3);
  const rhoWalls = getMaterialDensity(envelope.walls.material, envelope.walls.density_kgm3);
  const rhoFloor = getMaterialDensity(envelope.floor.material, envelope.floor.density_kgm3);

  const massRoof  = A_roof  * envelope.roof.thickness_m  * rhoRoof;
  const massWalls = A_walls * envelope.walls.thickness_m * rhoWalls;
  const massFloor = A_floor * envelope.floor.thickness_m * rhoFloor;

  // Glazing mass estimate: ~10 kg/m² for double-pane polycarbonate
  const massGlazing = envelope.glazing.area_m2 * 10;

  // PCM mass
  const massPCM = (pcm && pcm.present) ? (pcm.mass_kg || 0) : 0;

  // Structural frame (20% overhead)
  const massEnvelope  = massRoof + massWalls + massFloor + massGlazing;
  const massStructure = massEnvelope * 0.20;

  // Fittings, fasteners, doors estimate: 5%
  const massFittings  = massEnvelope * 0.05;

  const totalMassKg = massRoof + massWalls + massFloor + massGlazing +
                      massPCM + massStructure + massFittings;

  return {
    breakdown: {
      roofKg:      Math.round(massRoof      * 10) / 10,
      wallsKg:     Math.round(massWalls     * 10) / 10,
      floorKg:     Math.round(massFloor     * 10) / 10,
      glazingKg:   Math.round(massGlazing   * 10) / 10,
      pcmKg:       Math.round(massPCM       * 10) / 10,
      structureKg: Math.round(massStructure * 10) / 10,
      fittingsKg:  Math.round(massFittings  * 10) / 10,
    },
    totalMassKg: Math.round(totalMassKg * 10) / 10,
  };
}

// ─── Volume computation ───────────────────────────────────────────────────────

/**
 * Compute packed volume of shelter components.
 * Flat-pack assumption: panels/fabric packed to ~20% of deployed volume.
 * Structural frame ~ 10% of deployed volume (modular tubes/poles).
 *
 * @param {object} config - ShelterConfig plain object
 * @returns {object} { deployedVolumeM3, packedVolumeM3 }
 */
function computeShelterVolume(config) {
  const { geometry } = config;
  const { length_m, width_m, height_m } = geometry;

  const deployedVolumeM3 = length_m * width_m * height_m;

  // Flat-pack efficiency: military shelters typically pack to 15–25% of deployed volume
  const packingFactor  = 0.20;
  const packedVolumeM3 = deployedVolumeM3 * packingFactor;

  return {
    deployedVolumeM3: Math.round(deployedVolumeM3 * 100) / 100,
    packedVolumeM3:   Math.round(packedVolumeM3   * 100) / 100,
  };
}

// ─── Logistics audit ──────────────────────────────────────────────────────────

/**
 * Full logistics audit for a ShelterConfig.
 *
 * @param {object} config - ShelterConfig plain object
 * @returns {object} Logistics result
 */
function auditLogistics(config) {
  const massResult   = computeShelterMass(config);
  const volumeResult = computeShelterVolume(config);
  const { totalMassKg } = massResult;
  const { packedVolumeM3, deployedVolumeM3 } = volumeResult;

  const notes = [];

  // Mi-17 feasibility
  const mi17MassFeasible   = totalMassKg   <= MI17_PAYLOAD_KG;
  const mi17VolumeFeasible = packedVolumeM3 <= MI17_VOLUME_M3;
  const airliftFeasible    = mi17MassFeasible && mi17VolumeFeasible;

  if (!mi17MassFeasible) {
    notes.push(`⚠️ Mass ${totalMassKg} kg exceeds Mi-17 payload limit of ${MI17_PAYLOAD_KG} kg (overage: ${Math.round(totalMassKg - MI17_PAYLOAD_KG)} kg). Consider reducing PCM mass or envelope thickness.`);
  }
  if (!mi17VolumeFeasible) {
    notes.push(`⚠️ Packed volume ${packedVolumeM3} m³ exceeds Mi-17 cargo volume of ${MI17_VOLUME_M3} m³. Consider redesigning panel geometry for better flat-pack ratio.`);
  }
  if (airliftFeasible) {
    notes.push(`✅ Shelter is airlift-feasible (Mi-17 helicopter): mass ${totalMassKg} kg / ${MI17_PAYLOAD_KG} kg, volume ${packedVolumeM3} m³ / ${MI17_VOLUME_M3} m³.`);
  }

  // ALS truck feasibility
  const alsMassFeasible   = totalMassKg   <= ALS_PAYLOAD_KG;
  const alsVolumeFeasible = packedVolumeM3 <= ALS_VOLUME_M3;
  const truckFeasible     = alsMassFeasible && alsVolumeFeasible;

  if (truckFeasible) {
    notes.push(`✅ Shelter is road-transport-feasible (ALS truck): mass ${totalMassKg} kg / ${ALS_PAYLOAD_KG} kg, volume ${packedVolumeM3} m³ / ${ALS_VOLUME_M3} m³.`);
  }

  // Mass constraint check (shelter-specific limit from config)
  if (config.massConstraintKg && totalMassKg > config.massConstraintKg) {
    notes.push(`⚠️ Total mass ${totalMassKg} kg exceeds configured limit ${config.massConstraintKg} kg.`);
  }

  return {
    totalMassKg,
    packedVolumeM3,
    deployedVolumeM3,
    massBreakdown:    massResult.breakdown,
    mi17Feasibility: {
      airlift:          airliftFeasible,
      massOk:           mi17MassFeasible,
      volumeOk:         mi17VolumeFeasible,
      massHeadroomKg:   Math.round((MI17_PAYLOAD_KG  - totalMassKg)  * 10) / 10,
      volumeHeadroomM3: Math.round((MI17_VOLUME_M3   - packedVolumeM3) * 100) / 100,
    },
    alsFeasibility: {
      truck:            truckFeasible,
      massOk:           alsMassFeasible,
      volumeOk:         alsVolumeFeasible,
      massHeadroomKg:   Math.round((ALS_PAYLOAD_KG   - totalMassKg)  * 10) / 10,
      volumeHeadroomM3: Math.round((ALS_VOLUME_M3    - packedVolumeM3) * 100) / 100,
    },
    airliftFeasible,
    truckFeasible,
    packingNotes: notes,
  };
}

module.exports = { auditLogistics, computeShelterMass, computeShelterVolume };
