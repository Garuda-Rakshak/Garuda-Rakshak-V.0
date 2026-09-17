'use strict';

const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  lat:         { type: Number, required: true },
  lon:         { type: Number, required: true },
  altitude_m:  { type: Number, required: true },
}, { _id: false });

const EnvelopeLayerSchema = new mongoose.Schema({
  uValue:      { type: Number, required: true, min: 0 }, // W/(m²·K)
  thickness_m: { type: Number, required: true, min: 0 },
  material:    { type: String, required: true },
  density_kgm3:   { type: Number, default: 1200 },       // kg/m³
  specificHeat_JkgK: { type: Number, default: 840 },     // J/(kg·K)
}, { _id: false });

const GlazingSchema = new mongoose.Schema({
  area_m2: { type: Number, required: true, min: 0 },
  uValue:  { type: Number, required: true, min: 0 },
  shgc:    { type: Number, required: true, min: 0, max: 1 }, // Solar Heat Gain Coefficient
}, { _id: false });

const EnvelopeSchema = new mongoose.Schema({
  roof:    { type: EnvelopeLayerSchema, required: true },
  walls:   { type: EnvelopeLayerSchema, required: true },
  floor:   { type: EnvelopeLayerSchema, required: true },
  glazing: { type: GlazingSchema, required: true },
}, { _id: false });

const PcmSchema = new mongoose.Schema({
  present:         { type: Boolean, default: false },
  meltPoint_C:     { type: Number, default: 28 },
  latentHeat_kJkg: { type: Number, default: 200 },   // kJ/kg
  mass_kg:         { type: Number, default: 50 },
  sigma_C:         { type: Number, default: 1.5 },   // Gaussian half-width around melt point
}, { _id: false });

const GeometrySchema = new mongoose.Schema({
  length_m:        { type: Number, required: true, min: 1 },
  width_m:         { type: Number, required: true, min: 1 },
  height_m:        { type: Number, required: true, min: 1 },
  orientation_deg: { type: Number, default: 0, min: 0, max: 360 }, // 0 = North-facing roof normal
}, { _id: false });

const ShelterConfigSchema = new mongoose.Schema({
  name:               { type: String, required: true, trim: true },
  createdBy:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  location:           { type: LocationSchema, required: true },
  geometry:           { type: GeometrySchema, required: true },
  envelope:           { type: EnvelopeSchema, required: true },
  pcm:                { type: PcmSchema, default: () => ({}) },
  infiltrationRateACH:{ type: Number, default: 0.5, min: 0 }, // Air changes per hour
  internalGainsW:     { type: Number, default: 200, min: 0 }, // Occupants + equipment (W)
  massConstraintKg:   { type: Number, default: 1500 },         // Mi-17 airlift limit
  notes:              { type: String, default: '' },
}, {
  timestamps: true,
  toJSON:     { virtuals: true },
  toObject:   { virtuals: true },
});

// Index for fast lookups
ShelterConfigSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model('ShelterConfig', ShelterConfigSchema);
