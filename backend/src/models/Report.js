'use strict';

const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  simulationRunId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'SimulationRun',
    required: true,
  },
  type:        { type: String, enum: ['pdf', 'apdl'], required: true },
  filePath:    { type: String, required: true },
  fileName:    { type: String, required: true },
  sizeBytes:   { type: Number, default: 0 },
  generatedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

ReportSchema.index({ simulationRunId: 1, type: 1 });

module.exports = mongoose.model('Report', ReportSchema);
