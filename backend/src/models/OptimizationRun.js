'use strict';

const mongoose = require('mongoose');

const FitnessSchema = new mongoose.Schema({
  weightKg:        { type: Number },
  thermalScore:    { type: Number }, // higher = better
  minIndoorC:      { type: Number },
  maxIndoorC:      { type: Number },
  stealthScore:    { type: Number },
}, { _id: false });

const ParetoMemberSchema = new mongoose.Schema({
  candidateConfig: { type: mongoose.Schema.Types.Mixed }, // partial ShelterConfig params
  fitness:         { type: FitnessSchema },
  rank:            { type: Number },
  crowdingDist:    { type: Number },
}, { _id: false });

const OptimizationRunSchema = new mongoose.Schema({
  baseConfigId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'ShelterConfig',
    required: true,
  },
  objectives:      { type: [String], default: ['minWeight', 'maxThermalPerformance'] },
  generations:     { type: Number, default: 20 },
  populationSize:  { type: Number, default: 40 },
  paretoFront:     { type: [ParetoMemberSchema], default: [] },
  generationLog: [{
    generation:   { type: Number },
    bestWeight:   { type: Number },
    bestThermal:  { type: Number },
    frontSize:    { type: Number },
  }],
  status: {
    type:    String,
    enum:    ['queued', 'running', 'complete', 'failed'],
    default: 'queued',
  },
  errorMessage: { type: String },
  startedAt:    { type: Date },
  completedAt:  { type: Date },
  durationMs:   { type: Number },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

OptimizationRunSchema.index({ baseConfigId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('OptimizationRun', OptimizationRunSchema);
