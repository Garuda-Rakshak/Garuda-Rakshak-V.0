'use strict';

/**
 * PDF Report Generator — AeroTwin-Habitat
 *
 * Generates a structured engineering audit PDF for a completed SimulationRun.
 * Uses pdfkit (pure Node.js, no browser required — air-gap safe).
 *
 * Contents:
 *   1. Cover page: project info, date, shelter name
 *   2. Configuration summary table
 *   3. 24h temperature data table (sampled every hour)
 *   4. Heat-loss breakdown
 *   5. FLIR stealth assessment
 *   6. Logistics feasibility
 *   7. Footer: AeroTwin-Habitat / SIH26054
 */

const path   = require('path');
const fs     = require('fs');
const PDFDoc = require('pdfkit');

const { getEnv } = require('../config/env');

// ─── Color palette ────────────────────────────────────────────────────────────
const COLORS = {
  primary:   '#1a3a5c',  // deep navy
  accent:    '#e67e22',  // orange accent
  light:     '#f4f6f8',
  text:      '#2c3e50',
  muted:     '#7f8c8d',
  good:      '#27ae60',
  warn:      '#e67e22',
  bad:       '#e74c3c',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function formatDate(d) {
  return new Date(d).toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
}

function tempColor(tempC) {
  if (tempC < 10)  return COLORS.bad;
  if (tempC < 15)  return COLORS.warn;
  return COLORS.good;
}

// ─── PDF section helpers ──────────────────────────────────────────────────────

function drawHorizontalRule(doc, y = null) {
  const yPos = y || doc.y;
  doc.moveTo(50, yPos).lineTo(doc.page.width - 50, yPos)
     .strokeColor(COLORS.primary).lineWidth(0.5).stroke();
  doc.moveDown(0.5);
}

function sectionTitle(doc, title) {
  doc.moveDown(0.5);
  doc.rect(50, doc.y, doc.page.width - 100, 18).fill(COLORS.primary);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10)
     .text(title, 56, doc.y - 14);
  doc.fillColor(COLORS.text).font('Helvetica').fontSize(9);
  doc.moveDown(0.8);
}

function tableRow(doc, cols, widths, isHeader = false) {
  const startX = 50;
  const startY = doc.y;
  const rowH   = 16;

  if (isHeader) {
    doc.rect(startX, startY, widths.reduce((a, b) => a + b, 0), rowH).fill(COLORS.light);
  }

  let x = startX;
  cols.forEach((col, i) => {
    doc.fillColor(isHeader ? COLORS.primary : COLORS.text)
       .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
       .fontSize(8)
       .text(String(col), x + 4, startY + 4, { width: widths[i] - 8, lineBreak: false });
    x += widths[i];
  });

  doc.y = startY + rowH;
  doc.moveDown(0);
}

// ─── Main report generator ────────────────────────────────────────────────────

/**
 * Generate a PDF report for a SimulationRun.
 *
 * @param {object} simulationRun  - Populated SimulationRun document (plain object)
 * @param {object} shelterConfig  - ShelterConfig plain object
 * @returns {Promise<{filePath, fileName, sizeBytes}>}
 */
async function generatePdfReport(simulationRun, shelterConfig) {
  const env      = getEnv();
  const reportsDir = path.resolve(env.REPORTS_DIR);
  ensureDir(reportsDir);

  const fileName = `aerotwin_report_${simulationRun._id}.pdf`;
  const filePath = path.join(reportsDir, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDoc({ margin: 50, size: 'A4' });
    const ws  = fs.createWriteStream(filePath);

    doc.pipe(ws);

    // ── PAGE 1: Cover ─────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 160).fill(COLORS.primary);
    doc.fillColor('#ffffff')
       .font('Helvetica-Bold').fontSize(22)
       .text('AeroTwin-Habitat', 50, 40);
    doc.font('Helvetica').fontSize(12)
       .text('Engineering Thermal Audit Report', 50, 70);
    doc.fontSize(10)
       .text(`Shelter: ${shelterConfig.name || 'Unnamed'}`, 50, 95)
       .text(`Location: ${shelterConfig.location ? shelterConfig.location.name : '-'}`, 50, 110)
       .text(`Generated: ${formatDate(new Date())}`, 50, 125)
       .text(`Run ID: ${simulationRun._id}`, 50, 140);

    doc.fillColor(COLORS.text).y = 180;
    doc.moveDown(1);

    // ── SECTION 1: Configuration Summary ─────────────────────────────────
    sectionTitle(doc, '1. Shelter Configuration Summary');

    const geo = shelterConfig.geometry || {};
    const env2 = shelterConfig.envelope || {};
    const loc  = shelterConfig.location || {};
    const pcm  = shelterConfig.pcm || {};

    const configRows = [
      ['Parameter', 'Value'],
      ['Name',             shelterConfig.name || '-'],
      ['Location',         `${loc.name || '-'} (${loc.lat || 0}°N, ${loc.lon || 0}°E, ${loc.altitude_m || 0} m)`],
      ['Dimensions',       `${geo.length_m || '-'} × ${geo.width_m || '-'} × ${geo.height_m || '-'} m (L×W×H)`],
      ['Orientation',      `${geo.orientation_deg || 0}° from North`],
      ['Roof U-value',     `${env2.roof ? env2.roof.uValue : '-'} W/(m²·K), ${env2.roof ? env2.roof.thickness_m : '-'} m thick`],
      ['Walls U-value',    `${env2.walls ? env2.walls.uValue : '-'} W/(m²·K), ${env2.walls ? env2.walls.thickness_m : '-'} m thick`],
      ['Floor U-value',    `${env2.floor ? env2.floor.uValue : '-'} W/(m²·K), ${env2.floor ? env2.floor.thickness_m : '-'} m thick`],
      ['Glazing',          `${env2.glazing ? env2.glazing.area_m2 : '-'} m², SHGC=${env2.glazing ? env2.glazing.shgc : '-'}`],
      ['Infiltration',     `${shelterConfig.infiltrationRateACH || '-'} ACH`],
      ['Internal Gains',   `${shelterConfig.internalGainsW || '-'} W`],
      ['PCM',              pcm.present ? `${pcm.mass_kg} kg @ ${pcm.meltPoint_C}°C melt, ${pcm.latentHeat_kJkg} kJ/kg` : 'None'],
      ['Mass Constraint',  `${shelterConfig.massConstraintKg || '-'} kg (airlift limit)`],
    ];

    const cw = [160, 330];
    configRows.forEach((row, i) => tableRow(doc, row, cw, i === 0));
    doc.moveDown(0.5);

    // ── SECTION 2: Simulation Settings ───────────────────────────────────
    sectionTitle(doc, '2. Simulation Settings & Performance');

    const input   = simulationRun.input   || {};
    const results = simulationRun.results || {};

    const simRows = [
      ['Parameter',           'Value'],
      ['Simulation Duration', `${input.hoursSimulated || 24} hours`],
      ['Time Step',           `${input.stepMinutes || 1} minute(s)`],
      ['Min Indoor Temp',     `${results.minIndoorC != null ? results.minIndoorC + ' °C' : '-'}`],
      ['Max Indoor Temp',     `${results.maxIndoorC != null ? results.maxIndoorC + ' °C' : '-'}`],
      ['Mean Indoor Temp',    `${results.meanIndoorC != null ? results.meanIndoorC + ' °C' : '-'}`],
      ['Simulation Status',   simulationRun.status || '-'],
      ['Duration (wall)',     simulationRun.durationMs != null ? `${simulationRun.durationMs} ms` : '-'],
    ];

    simRows.forEach((row, i) => tableRow(doc, row, cw, i === 0));
    doc.moveDown(0.5);

    // ── SECTION 3: 24h Temperature Profile (hourly sample) ───────────────
    sectionTitle(doc, '3. 24-Hour Temperature Profile (Hourly Sample)');

    const ts    = (results.timeSeries || []);
    const hourly = ts.filter((_, i) => i % Math.max(1, Math.round(60 / ((input.stepMinutes || 1)))) === 0).slice(0, 25);

    const tsHeaders = ['Hour', 'Ambient (°C)', 'Indoor (°C)', 'Solar (W/m²)', 'Heat Loss (W)', 'PCM Fraction'];
    const tsWidths  = [50, 80, 80, 90, 90, 80];
    tableRow(doc, tsHeaders, tsWidths, true);

    hourly.forEach((row) => {
      tableRow(doc, [
        `${String(Math.round(row.t || 0)).padStart(2, '0')}:00`,
        row.ambientC != null ? row.ambientC.toFixed(1) : '-',
        row.indoorC  != null ? row.indoorC.toFixed(1)  : '-',
        row.solarWm2 != null ? row.solarWm2.toFixed(0) : '-',
        row.heatLossW != null ? row.heatLossW.toFixed(0) : '-',
        row.pcmStateFraction != null ? row.pcmStateFraction.toFixed(3) : '0.000',
      ], tsWidths, false);
    });

    doc.moveDown(0.5);

    // ── SECTION 4: Heat Loss Breakdown ────────────────────────────────────
    doc.addPage();
    sectionTitle(doc, '4. Heat Loss Breakdown (Mean Power, W)');

    const hlb = results.heatLossBreakdown || {};
    const total = Object.values(hlb).reduce((s, v) => s + (v || 0), 0);

    const hlRows = [
      ['Component', 'Mean Heat Loss (W)', '% of Total'],
      ['Roof',         hlb.roofW        != null ? hlb.roofW.toFixed(1)        : '-', total ? ((hlb.roofW || 0)        / total * 100).toFixed(1) + '%' : '-'],
      ['Walls',        hlb.wallsW       != null ? hlb.wallsW.toFixed(1)       : '-', total ? ((hlb.wallsW || 0)       / total * 100).toFixed(1) + '%' : '-'],
      ['Floor',        hlb.floorW       != null ? hlb.floorW.toFixed(1)       : '-', total ? ((hlb.floorW || 0)       / total * 100).toFixed(1) + '%' : '-'],
      ['Glazing',      hlb.glazingW     != null ? hlb.glazingW.toFixed(1)     : '-', total ? ((hlb.glazingW || 0)     / total * 100).toFixed(1) + '%' : '-'],
      ['Infiltration', hlb.infiltrationW != null ? hlb.infiltrationW.toFixed(1) : '-', total ? ((hlb.infiltrationW || 0) / total * 100).toFixed(1) + '%' : '-'],
      ['TOTAL',        total.toFixed(1), '100%'],
    ];

    const hlWidths = [150, 170, 170];
    hlRows.forEach((row, i) => tableRow(doc, row, hlWidths, i === 0 || i === hlRows.length - 1));
    doc.moveDown(0.5);

    // ── SECTION 5: FLIR Stealth Assessment ───────────────────────────────
    sectionTitle(doc, '5. FLIR Thermal Stealth Assessment');

    const flirDelta  = results.flirDeltaC     != null ? results.flirDeltaC     : '-';
    const stealth    = results.stealthScore   != null ? results.stealthScore   : '-';
    const flirRows   = [
      ['Metric', 'Value'],
      ['FLIR ΔT (surface vs background)',  `${flirDelta} °C`],
      ['Stealth Score (0–100)',             `${stealth}`],
      ['Detection Risk',                    Math.abs(flirDelta) > 3 ? '⚠️ HIGH' : Math.abs(flirDelta) > 1 ? '🟡 MODERATE' : '✅ LOW'],
    ];

    flirRows.forEach((row, i) => tableRow(doc, row, cw, i === 0));
    doc.moveDown(0.5);

    // ── SECTION 6: Logistics Feasibility ─────────────────────────────────
    sectionTitle(doc, '6. Logistics & Airlift Feasibility');

    const log = results.logistics || {};
    const logRows = [
      ['Metric', 'Value'],
      ['Total Mass',                `${log.totalMassKg != null ? log.totalMassKg : '-'} kg`],
      ['Packed Volume',             `${log.volumeM3    != null ? log.volumeM3    : '-'} m³`],
      ['Mi-17 Airlift Feasible',    log.airliftFeasible ? '✅ YES' : '❌ NO'],
      ['ALS Truck Feasible',        log.truckFeasible   ? '✅ YES' : '❌ NO'],
    ];

    logRows.forEach((row, i) => tableRow(doc, row, cw, i === 0));

    if (log.packingNotes && log.packingNotes.length) {
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.text).text('Packing Notes:');
      doc.font('Helvetica').fontSize(8);
      log.packingNotes.forEach((note) => {
        doc.text(`• ${note}`, { indent: 10 });
      });
    }

    // ── Footer ────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 40;
    doc.rect(0, footerY - 10, doc.page.width, 50).fill(COLORS.primary);
    doc.fillColor('#ffffff').fontSize(8)
       .text('AeroTwin-Habitat | SIH26054 | CONFIDENTIAL — FOR OFFICIAL USE ONLY', 50, footerY, {
         align: 'center',
         width: doc.page.width - 100,
       });

    doc.end();

    ws.on('finish', () => {
      const sizeBytes = fs.statSync(filePath).size;
      resolve({ filePath, fileName, sizeBytes });
    });
    ws.on('error', reject);
  });
}

module.exports = { generatePdfReport };
