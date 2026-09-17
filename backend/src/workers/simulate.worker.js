'use strict';

/**
 * Simulation Worker Thread
 * Runs the full thermal engine, FLIR scoring, logistics audit,
 * and persists results to MongoDB.
 *
 * Communicates via parentPort.postMessage() for WebSocket progress.
 */

const { workerData, parentPort } = require('worker_threads');
require('dotenv').config();

// Mongoose needs to connect in worker context
const mongoose = require('mongoose');

async function main() {
  const { runId, config, hoursSimulated, stepMinutes, date, stationName } = workerData;

  // ── Connect to MongoDB in worker ────────────────────────────────────────
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aerotwin_habitat';
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });

  // ── Dynamic require after connection ────────────────────────────────────
  const SimulationRun = require('../models/SimulationRun');
  const WeatherStation = require('../models/WeatherStation');
  const { runSimulation }        = require('../services/thermalEngine.service');
  const { computeFlirSignature } = require('../services/flirStealth.service');
  const { auditLogistics }       = require('../services/logistics.service');
  const { generate24hSolarProfile, ambientProfileFromClimatology } = require('../services/solar.service');

  try {
    // Update status to running
    await SimulationRun.findByIdAndUpdate(runId, { status: 'running', startedAt: new Date() });
    parentPort.postMessage({ type: 'status', status: 'running', percent: 0 });

    // ── Build ambient profile ─────────────────────────────────────────────
    let ambientProfile = null;
    if (stationName) {
      const station = await WeatherStation.findOne({ stationName });
      if (station) {
        const month = new Date(date || Date.now()).getMonth() + 1; // 1–12
        ambientProfile = ambientProfileFromClimatology(
          station.hourlyClimatology, month, stepMinutes
        );
      }
    }

    parentPort.postMessage({ type: 'progress', percent: 5, message: 'Ambient profile loaded' });

    // ── Run simulation ────────────────────────────────────────────────────
    const startMs    = Date.now();
    const simDate    = date ? new Date(date) : new Date();

    const simResults = await runSimulation(config, {
      hoursSimulated,
      stepMinutes,
      date:           simDate,
      ambientProfile,
      nodesPerLayer:  5,
      surrogateMode:  false,
    });

    const durationMs = Date.now() - startMs;
    parentPort.postMessage({ type: 'progress', percent: 80, message: 'Thermal simulation complete', durationMs });

    // ── FLIR stealth scoring ──────────────────────────────────────────────
    const lastAmbient = ambientProfile
      ? ambientProfile[ambientProfile.length - 1]
      : simResults.timeSeries[simResults.timeSeries.length - 1]?.ambientC || -10;

    const flirResult = computeFlirSignature({
      T_skinC:    simResults.skinTempC,
      T_ambC:     lastAmbient,
      emissivity: 0.9,
      tiltDeg:    0,
      altitude_m: config.location?.altitude_m || 3500,
      distance_m: 500,
      humidity:   0.15,
    });

    parentPort.postMessage({ type: 'progress', percent: 88, message: 'FLIR analysis complete' });

    // ── Logistics audit ───────────────────────────────────────────────────
    const logResult = auditLogistics(config);

    parentPort.postMessage({ type: 'progress', percent: 95, message: 'Logistics audit complete' });

    // ── Persist results ───────────────────────────────────────────────────
    const updatedRun = await SimulationRun.findByIdAndUpdate(runId, {
      status:     'complete',
      durationMs,
      results: {
        timeSeries:        simResults.timeSeries,
        minIndoorC:        simResults.minIndoorC,
        maxIndoorC:        simResults.maxIndoorC,
        meanIndoorC:       simResults.meanIndoorC,
        heatLossBreakdown: simResults.heatLossBreakdown,
        flirDeltaC:        flirResult.flirDeltaC,
        stealthScore:      flirResult.stealthScore,
        logistics: {
          totalMassKg:     logResult.totalMassKg,
          volumeM3:        logResult.packedVolumeM3,
          airliftFeasible: logResult.airliftFeasible,
          truckFeasible:   logResult.truckFeasible,
          packingNotes:    logResult.packingNotes,
        },
      },
    }, { new: true });

    parentPort.postMessage({
      type:      'complete',
      percent:   100,
      runId,
      durationMs,
      summary: {
        minIndoorC:   simResults.minIndoorC,
        maxIndoorC:   simResults.maxIndoorC,
        meanIndoorC:  simResults.meanIndoorC,
        stealthScore: flirResult.stealthScore,
        airliftFeasible: logResult.airliftFeasible,
      },
    });

  } catch (err) {
    console.error('Simulation worker failed:', err);
    try {
      const SimulationRun = require('../models/SimulationRun');
      await SimulationRun.findByIdAndUpdate(runId, {
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
  console.error('Simulation worker fatal:', err);
  parentPort.postMessage({ type: 'error', message: err.message });
  process.exit(1);
});
