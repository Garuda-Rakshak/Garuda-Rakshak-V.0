'use strict';

/**
 * ANSYS APDL (.mac) Export Service — AeroTwin-Habitat
 *
 * Renders the shelter.mac.ejs template with ShelterConfig parameters
 * to produce an ANSYS-ready transient thermal analysis script.
 */

const path = require('path');
const fs   = require('fs');
const ejs  = require('ejs');
const { getEnv } = require('../config/env');

// Material conductivity lookup (W/m·K)
const MATERIAL_K = {
  'insulated_panel':   0.04,
  'aerogel_blanket':   0.015,
  'military_tent':     0.05,
  'polyurethane_foam': 0.03,
  'gfrp_panel':        0.35,
  'plywood':           0.15,
  'concrete_block':    1.0,
  'aluminum_sheet':    205,
  'default':           0.05,
};

const MATERIAL_RHO = {
  'insulated_panel':   40,
  'aerogel_blanket':   100,
  'military_tent':     2,
  'polyurethane_foam': 30,
  'gfrp_panel':        1800,
  'plywood':           600,
  'concrete_block':    2000,
  'aluminum_sheet':    2700,
  'default':           200,
};

const MATERIAL_CP = {
  'insulated_panel':   1000,
  'aerogel_blanket':   1000,
  'military_tent':     1000,
  'polyurethane_foam': 1300,
  'gfrp_panel':        840,
  'plywood':           1700,
  'concrete_block':    880,
  'aluminum_sheet':    900,
  'default':           1000,
};

function matK(material, uValue, thickness)   { return MATERIAL_K[material]   || (uValue * thickness); }
function matRho(material, density)           { return density || MATERIAL_RHO[material]   || 200; }
function matCp(material, cp)                 { return cp      || MATERIAL_CP[material]    || 1000; }

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

const TEMPLATE_PATH = path.join(__dirname, '../templates/shelter.mac.ejs');

/**
 * Generate an ANSYS APDL .mac file from a ShelterConfig.
 *
 * @param {object} shelterConfig  - ShelterConfig plain object
 * @param {object} simulationRun  - SimulationRun plain object (for context)
 * @returns {Promise<{filePath, fileName, sizeBytes}>}
 */
async function generateApdlScript(shelterConfig, simulationRun) {
  const env        = getEnv();
  const exportsDir = path.resolve(env.EXPORTS_DIR);
  ensureDir(exportsDir);

  const { envelope, geometry, location, pcm } = shelterConfig;
  const results    = simulationRun.results || {};
  const timeSeries = results.timeSeries    || [];

  // Representative ambient temperature (mean from results or default)
  const meanAmbient = results.meanIndoorC != null
    ? Math.round(timeSeries.reduce((s, r) => s + (r.ambientC || 0), 0) / Math.max(1, timeSeries.length))
    : -10;

  // Peak solar flux for roof BC
  const peakSolar   = timeSeries.reduce((max, r) => Math.max(max, r.solarWm2 || 0), 500);
  const solarFlux   = Math.round(peakSolar * 0.9); // absorptivity 0.9

  // PCM peak apparent Cp
  const pcmL_Jkg   = pcm && pcm.present ? (pcm.latentHeat_kJkg || 200) * 1000 : 0;
  const pcmSigma    = pcm && pcm.sigma_C ? pcm.sigma_C : 1.5;
  const pcmPeakCp   = Math.round(840 + pcmL_Jkg / (pcmSigma * Math.sqrt(2 * Math.PI)));

  const templateVars = {
    // Identification
    shelterName:      shelterConfig.name        || 'Unnamed Shelter',
    locationName:     location.name             || '-',
    lat:              location.lat              || 0,
    lon:              location.lon              || 0,
    altitude_m:       location.altitude_m       || 3500,
    runId:            String(simulationRun._id  || 'N/A'),
    generatedAt:      new Date().toISOString(),

    // Geometry
    length_m:         geometry.length_m          || 6,
    width_m:          geometry.width_m           || 4,
    height_m:         geometry.height_m          || 3,

    // Roof material
    roofMaterial:     envelope.roof.material          || 'insulated_panel',
    roofThickness:    envelope.roof.thickness_m        || 0.1,
    roofConductivity: matK(envelope.roof.material, envelope.roof.uValue, envelope.roof.thickness_m),
    roofSpecificHeat: matCp(envelope.roof.material, envelope.roof.specificHeat_JkgK),
    roofDensity:      matRho(envelope.roof.material, envelope.roof.density_kgm3),

    // Wall material
    wallMaterial:     envelope.walls.material          || 'insulated_panel',
    wallThickness:    envelope.walls.thickness_m        || 0.08,
    wallConductivity: matK(envelope.walls.material, envelope.walls.uValue, envelope.walls.thickness_m),
    wallSpecificHeat: matCp(envelope.walls.material, envelope.walls.specificHeat_JkgK),
    wallDensity:      matRho(envelope.walls.material, envelope.walls.density_kgm3),

    // Floor material
    floorMaterial:    envelope.floor.material          || 'insulated_panel',
    floorThickness:   envelope.floor.thickness_m        || 0.08,
    floorConductivity:matK(envelope.floor.material, envelope.floor.uValue, envelope.floor.thickness_m),
    floorSpecificHeat:matCp(envelope.floor.material, envelope.floor.specificHeat_JkgK),
    floorDensity:     matRho(envelope.floor.material, envelope.floor.density_kgm3),

    // PCM
    hasPcm:           !!(pcm && pcm.present),
    pcmMeltPoint:     pcm ? (pcm.meltPoint_C      || 28)  : 28,
    pcmLatentHeat:    pcm ? (pcm.latentHeat_kJkg  || 200) : 200,
    pcmPeakCp,

    // Boundary conditions
    T_ambient_C:      meanAmbient,
    T_ground_C:       meanAmbient - 2,
    T_indoor_init_C:  (results.minIndoorC != null ? results.minIndoorC : meanAmbient + 5),
    T_init_C:         meanAmbient,
    h_ext:            15,   // W/(m²·K) exterior convection
    h_int:            5,    // W/(m²·K) interior convection
    solarPeakFlux:    solarFlux,

    // Meshing
    meshSize:         Math.min(envelope.roof.thickness_m / 3, 0.05).toFixed(3),
  };

  const templateSource = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const rendered       = ejs.render(templateSource, templateVars);

  const fileName = `aerotwin_apdl_${simulationRun._id}.mac`;
  const filePath = path.join(exportsDir, fileName);
  fs.writeFileSync(filePath, rendered, 'utf8');

  const sizeBytes = fs.statSync(filePath).size;
  return { filePath, fileName, sizeBytes };
}

module.exports = { generateApdlScript };
