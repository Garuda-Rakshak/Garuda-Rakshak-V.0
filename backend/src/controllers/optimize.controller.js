'use strict';

const path   = require('path');
const { Worker } = require('worker_threads');
const { z }      = require('zod');

const ShelterConfig   = require('../models/ShelterConfig');
const OptimizationRun = require('../models/OptimizationRun');
const { createError }  = require('../middleware/errorHandler');
const wsManager        = require('../websocket/simulateSocket');

const WORKER_PATH = path.join(__dirname, '../workers/optimize.worker.js');

const OptimizeSchema = z.object({
  baseConfigId:   z.string().min(1),
  generations:    z.number().int().min(1).max(100).optional().default(20),
  populationSize: z.number().int().min(10).max(200).optional().default(40),
  objectives:     z.array(z.string()).optional().default(['minWeight', 'maxThermalPerformance']),
});

async function startOptimization(req, res, next) {
  try {
    const parsed = OptimizeSchema.safeParse(req.body);
    if (!parsed.success) return next(createError(422, 'VALIDATION_ERROR', 'Invalid optimization input', parsed.error.errors));

    const { baseConfigId, generations, populationSize, objectives } = parsed.data;

    const configDoc = await ShelterConfig.findById(baseConfigId);
    if (!configDoc) return next(createError(404, 'NOT_FOUND', 'Shelter config not found'));

    const optRun = await OptimizationRun.create({
      baseConfigId:  configDoc._id,
      objectives,
      generations,
      populationSize,
      status:        'queued',
      createdBy:     req.user?.id,
    });

    res.status(202).json({
      success: true,
      data: {
        optimizationRunId: optRun._id,
        status: 'queued',
        message: `NSGA-II started: ${generations} generations, population ${populationSize}. Poll GET /api/v1/optimize/:id`,
      },
    });

    const worker = new Worker(WORKER_PATH, {
      workerData: {
        optimizationRunId: optRun._id.toString(),
        baseConfig:        configDoc.toObject(),
        generations,
        populationSize,
      },
    });

    worker.on('message', (msg) => {
      wsManager.broadcast(optRun._id.toString(), msg);
    });

    worker.on('error', async (err) => {
      console.error(`Optimizer worker error [${optRun._id}]:`, err.message);
      await OptimizationRun.findByIdAndUpdate(optRun._id, { status: 'failed', errorMessage: err.message });
      wsManager.broadcast(optRun._id.toString(), { type: 'error', message: err.message });
    });

  } catch (err) { next(err); }
}

async function getOptimizationResult(req, res, next) {
  try {
    const optRun = await OptimizationRun.findById(req.params.id)
      .populate('baseConfigId', 'name location geometry');
    if (!optRun) return next(createError(404, 'NOT_FOUND', 'Optimization run not found'));
    return res.json({ success: true, data: { optimizationRun: optRun } });
  } catch (err) { next(err); }
}

module.exports = { startOptimization, getOptimizationResult };
