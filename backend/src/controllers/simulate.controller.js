'use strict';

/**
 * Simulate Controller
 *
 * POST /api/v1/simulate
 *   - Accepts shelterConfigId (ref) or inline config
 *   - Creates SimulationRun document (status: queued)
 *   - Spawns a worker_thread to run the thermal engine
 *   - Returns runId immediately (non-blocking)
 *   - Worker updates DB and broadcasts WS events on completion
 */

const path   = require('path');
const { Worker } = require('worker_threads');
const { z }      = require('zod');

const ShelterConfig  = require('../models/ShelterConfig');
const SimulationRun  = require('../models/SimulationRun');
const { createError } = require('../middleware/errorHandler');
const wsManager      = require('../websocket/simulateSocket');

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const SimulateSchema = z.object({
  shelterConfigId: z.string().optional(),
  hoursSimulated:  z.number().min(1).max(72).optional().default(24),
  stepMinutes:     z.number().min(1).max(60).optional().default(1),
  date:            z.string().optional(), // ISO date string
  stationName:     z.string().optional(), // pre-seeded weather station name
});

// ─── Worker path ──────────────────────────────────────────────────────────────

const WORKER_PATH = path.join(__dirname, '../workers/simulate.worker.js');

// ─── Controller ───────────────────────────────────────────────────────────────

async function startSimulation(req, res, next) {
  try {
    const parsed = SimulateSchema.safeParse(req.body);
    if (!parsed.success) return next(createError(422, 'VALIDATION_ERROR', 'Invalid simulation input', parsed.error.errors));

    const { shelterConfigId, hoursSimulated, stepMinutes, date, stationName } = parsed.data;

    // Resolve shelter config
    let configDoc;
    if (shelterConfigId) {
      configDoc = await ShelterConfig.findById(shelterConfigId);
      if (!configDoc) return next(createError(404, 'NOT_FOUND', 'Shelter config not found'));
    } else {
      return next(createError(400, 'MISSING_CONFIG', 'shelterConfigId is required'));
    }

    const configObj = configDoc.toObject();

    // Create SimulationRun record
    const simRun = await SimulationRun.create({
      shelterConfigId: configDoc._id,
      configSnapshot:  configObj,
      input: {
        hoursSimulated,
        stepMinutes,
        date: date || new Date().toISOString().substring(0, 10),
        stationName: stationName || '',
      },
      status:    'queued',
      createdBy: req.user?.id,
    });

    // Respond immediately with run ID
    res.status(202).json({
      success: true,
      data: { runId: simRun._id, status: 'queued', message: 'Simulation started. Poll GET /api/v1/runs/:id for results.' },
    });

    // Spawn worker
    const worker = new Worker(WORKER_PATH, {
      workerData: {
        runId:          simRun._id.toString(),
        config:         configObj,
        hoursSimulated,
        stepMinutes,
        date:           date || new Date().toISOString().substring(0, 10),
        stationName:    stationName || '',
      },
    });

    worker.on('message', (msg) => {
      // Forward progress to WebSocket clients subscribed to this runId
      wsManager.broadcast(simRun._id.toString(), msg);
    });

    worker.on('error', async (err) => {
      console.error(`Simulation worker error [${simRun._id}]:`, err.message);
      await SimulationRun.findByIdAndUpdate(simRun._id, {
        status: 'failed',
        errorMessage: err.message,
      });
      wsManager.broadcast(simRun._id.toString(), { type: 'error', message: err.message });
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.warn(`Simulation worker [${simRun._id}] exited with code ${code}`);
      }
    });

  } catch (err) { next(err); }
}

module.exports = { startSimulation };
