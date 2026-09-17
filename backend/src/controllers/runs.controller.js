'use strict';

const SimulationRun  = require('../models/SimulationRun');
const { createError } = require('../middleware/errorHandler');

async function getById(req, res, next) {
  try {
    const run = await SimulationRun.findById(req.params.id)
      .populate('shelterConfigId', 'name location geometry')
      .populate('createdBy', 'name email');
    if (!run) return next(createError(404, 'NOT_FOUND', 'Simulation run not found'));
    return res.json({ success: true, data: { run } });
  } catch (err) { next(err); }
}

async function list(req, res, next) {
  try {
    const { page = 1, limit = 20, status, shelterConfigId } = req.query;
    const filter = {};
    if (status)          filter.status          = status;
    if (shelterConfigId) filter.shelterConfigId = shelterConfigId;

    const [runs, total] = await Promise.all([
      SimulationRun.find(filter)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .populate('shelterConfigId', 'name location')
        .select('-results.timeSeries'), // omit large timeSeries from list
      SimulationRun.countDocuments(filter),
    ]);

    return res.json({ success: true, data: { runs, total, page: Number(page), limit: Number(limit) } });
  } catch (err) { next(err); }
}

module.exports = { getById, list };
