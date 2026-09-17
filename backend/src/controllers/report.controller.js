'use strict';

const path = require('path');
const fs   = require('fs');

const SimulationRun  = require('../models/SimulationRun');
const ShelterConfig  = require('../models/ShelterConfig');
const Report         = require('../models/Report');
const { createError }        = require('../middleware/errorHandler');
const { generatePdfReport }  = require('../services/report.service');
const { generateApdlScript } = require('../services/apdlExport.service');

// ─── PDF Report ───────────────────────────────────────────────────────────────

async function downloadPdf(req, res, next) {
  try {
    const run = await SimulationRun.findById(req.params.id);
    if (!run) return next(createError(404, 'NOT_FOUND', 'Simulation run not found'));
    if (run.status !== 'complete') {
      return next(createError(409, 'NOT_READY', `Simulation is ${run.status} — report not available yet`));
    }

    // Check cache
    let report = await Report.findOne({ simulationRunId: run._id, type: 'pdf' });

    if (!report || !fs.existsSync(report.filePath)) {
      const config = run.configSnapshot
        || await ShelterConfig.findById(run.shelterConfigId);

      const { filePath, fileName, sizeBytes } = await generatePdfReport(run.toObject(), config);
      report = await Report.create({
        simulationRunId: run._id,
        type:       'pdf',
        filePath,
        fileName,
        sizeBytes,
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
    return fs.createReadStream(report.filePath).pipe(res);
  } catch (err) { next(err); }
}

// ─── APDL Export ─────────────────────────────────────────────────────────────

async function downloadApdl(req, res, next) {
  try {
    const run = await SimulationRun.findById(req.params.id);
    if (!run) return next(createError(404, 'NOT_FOUND', 'Simulation run not found'));
    if (run.status !== 'complete') {
      return next(createError(409, 'NOT_READY', `Simulation is ${run.status} — APDL export not available yet`));
    }

    let report = await Report.findOne({ simulationRunId: run._id, type: 'apdl' });

    if (!report || !fs.existsSync(report.filePath)) {
      const config = run.configSnapshot
        || await ShelterConfig.findById(run.shelterConfigId);

      const { filePath, fileName, sizeBytes } = await generateApdlScript(config, run.toObject());
      report = await Report.create({
        simulationRunId: run._id,
        type:       'apdl',
        filePath,
        fileName,
        sizeBytes,
      });
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
    return fs.createReadStream(report.filePath).pipe(res);
  } catch (err) { next(err); }
}

module.exports = { downloadPdf, downloadApdl };
