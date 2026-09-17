'use strict';

/**
 * Optimization Worker Thread
 * Runs NSGA-II genetic optimizer and streams progress back over WebSocket.
 */

const { workerData, parentPort } = require('worker_threads');
require('dotenv').config();

const mongoose = require('mongoose');

async function main() {
  const { optimizationRunId, baseConfig, generations, populationSize } = workerData;
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aerotwin_habitat';
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });

  const OptimizationRun   = require('../models/OptimizationRun');
  const { runOptimization } = require('../services/optimizer.service');

  try {
    await OptimizationRun.findByIdAndUpdate(optimizationRunId, {
      status:    'running',
      startedAt: new Date(),
    });
    parentPort.postMessage({ type: 'status', status: 'running', percent: 0 });

    const startMs = Date.now();

    const { paretoFront, generationLog } = await runOptimization(baseConfig, {
      generations,
      populationSize,
      onProgress: async ({ generation, bestFitness, percent, log }) => {
        parentPort.postMessage({ type: 'generation', generation, bestFitness, percent, log });

        // Update DB with progress
        await OptimizationRun.findByIdAndUpdate(optimizationRunId, {
          $push: { generationLog: log },
        });
      },
    });

    const durationMs = Date.now() - startMs;

    await OptimizationRun.findByIdAndUpdate(optimizationRunId, {
      status:      'complete',
      completedAt: new Date(),
      durationMs,
      paretoFront,
      generationLog,
    });

    parentPort.postMessage({
      type: 'complete',
      percent: 100,
      optimizationRunId,
      durationMs,
      paretoFrontSize: paretoFront.length,
    });

  } catch (err) {
    console.error('Optimizer worker failed:', err);
    try {
      await OptimizationRun.findByIdAndUpdate(optimizationRunId, {
        status: 'failed',
        errorMessage: err.message,
      });
    } catch (_) {}
    parentPort.postMessage({ type: 'error', message: err.message });
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  parentPort.postMessage({ type: 'error', message: err.message });
  process.exit(1);
});
