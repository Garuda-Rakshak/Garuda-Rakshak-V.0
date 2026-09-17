'use strict';

const mongoose = require('mongoose');

const TimeStepSchema = new mongoose.Schema({
  t:                { type: Number }, // hours from midnight
  ambientC:         { type: Number },
  indoorC:          { type: Number },
  solarWm2:         { type: Number },
  heatLossW:        { type: Number },
  pcmStateFraction: { type: Number, default: 0 }, // 0=solid, 1=fully melted
}, { _id: false });

const HeatLossBreakdownSchema = new mongoose.Schema({
  roofW:         { type: Number },
  wallsW:        { type: Number },
  floorW:        { type: Number },
  glazingW:      { type: Number },
  infiltrationW: { type: Number },
}, { _id: false });

const LogisticsResultSchema = new mongoose.Schema({
  totalMassKg:       { type: Number },
  volumeM3:          { type: Number },
  airliftFeasible:   { type: Boolean },
  truckFeasible:     { type: Boolean },
  packingNotes:      { type: [String] },
}, { _id: false });

const ResultsSchema = new mongoose.Schema({
  timeSeries:         { type: [TimeStepSchema], default: [] },
  minIndoorC:         { type: Number },
  maxIndoorC:         { type: Number },
  meanIndoorC:        { type: Number },
  heatLossBreakdown:  { type: HeatLossBreakdownSchema },
  flirDeltaC:         { type: Number },
  stealthScore:       { type: Number },
  logistics:          { type: LogisticsResultSchema },
}, { _id: false });

const SimulationRunSchema = new mongoose.Schema({
  shelterConfigId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'ShelterConfig',
    required: true,
  },
  configSnapshot: {
    type: mongoose.Schema.Types.Mixed, // full config at time of run
  },
  startedAt:   { type: Date },
  durationMs:  { type: Number },
  input: {
    hoursSimulated: { type: Number, default: 24 },
    stepMinutes:    { type: Number, default: 1 },
    date:           { type: String, default: '' }, // ISO date string for solar calc
    stationName:    { type: String, default: '' },
  },
  results: { type: ResultsSchema },
  status: {
    type:    String,
    enum:    ['queued', 'running', 'complete', 'failed'],
    default: 'queued',
  },
  errorMessage: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

SimulationRunSchema.index({ shelterConfigId: 1, status: 1, createdAt: -1 });
SimulationRunSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model('SimulationRun', SimulationRunSchema);
