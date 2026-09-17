'use strict';

const { z }          = require('zod');
const ShelterConfig  = require('../models/ShelterConfig');
const { createError } = require('../middleware/errorHandler');

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const EnvelopeLayerSchema = z.object({
  uValue:             z.number().positive(),
  thickness_m:        z.number().positive(),
  material:           z.string().min(1),
  density_kgm3:       z.number().positive().optional(),
  specificHeat_JkgK:  z.number().positive().optional(),
});

const ShelterCreateSchema = z.object({
  name: z.string().min(2).max(100),
  location: z.object({
    name:        z.string().min(1),
    lat:         z.number().min(-90).max(90),
    lon:         z.number().min(-180).max(180),
    altitude_m:  z.number().min(0).max(9000),
  }),
  geometry: z.object({
    length_m:        z.number().positive(),
    width_m:         z.number().positive(),
    height_m:        z.number().positive(),
    orientation_deg: z.number().min(0).max(360).optional().default(0),
  }),
  envelope: z.object({
    roof:    EnvelopeLayerSchema,
    walls:   EnvelopeLayerSchema,
    floor:   EnvelopeLayerSchema,
    glazing: z.object({
      area_m2: z.number().min(0),
      uValue:  z.number().positive(),
      shgc:    z.number().min(0).max(1),
    }),
  }),
  pcm: z.object({
    present:         z.boolean().optional().default(false),
    meltPoint_C:     z.number().optional().default(28),
    latentHeat_kJkg: z.number().positive().optional().default(200),
    mass_kg:         z.number().min(0).optional().default(0),
    sigma_C:         z.number().positive().optional().default(1.5),
  }).optional(),
  infiltrationRateACH: z.number().min(0).optional().default(0.5),
  internalGainsW:      z.number().min(0).optional().default(200),
  massConstraintKg:    z.number().positive().optional().default(1500),
  notes:               z.string().optional().default(''),
});

const ShelterUpdateSchema = ShelterCreateSchema.partial();

// ─── Controllers ─────────────────────────────────────────────────────────────

async function create(req, res, next) {
  try {
    const parsed = ShelterCreateSchema.safeParse(req.body);
    if (!parsed.success) return next(createError(422, 'VALIDATION_ERROR', 'Invalid shelter config', parsed.error.errors));

    const config = await ShelterConfig.create({
      ...parsed.data,
      createdBy: req.user?.id,
    });
    return res.status(201).json({ success: true, data: { config } });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const config = await ShelterConfig.findById(req.params.id).populate('createdBy', 'name email');
    if (!config) return next(createError(404, 'NOT_FOUND', 'Shelter config not found'));
    return res.json({ success: true, data: { config } });
  } catch (err) { next(err); }
}

async function list(req, res, next) {
  try {
    const { page = 1, limit = 20, name } = req.query;
    const filter = {};
    if (name) filter.name = { $regex: name, $options: 'i' };

    const [configs, total] = await Promise.all([
      ShelterConfig.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate('createdBy', 'name email'),
      ShelterConfig.countDocuments(filter),
    ]);

    return res.json({ success: true, data: { configs, total, page: Number(page), limit: Number(limit) } });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const parsed = ShelterUpdateSchema.safeParse(req.body);
    if (!parsed.success) return next(createError(422, 'VALIDATION_ERROR', 'Invalid update data', parsed.error.errors));

    const config = await ShelterConfig.findByIdAndUpdate(
      req.params.id, parsed.data, { new: true, runValidators: true }
    );
    if (!config) return next(createError(404, 'NOT_FOUND', 'Shelter config not found'));
    return res.json({ success: true, data: { config } });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const config = await ShelterConfig.findByIdAndDelete(req.params.id);
    if (!config) return next(createError(404, 'NOT_FOUND', 'Shelter config not found'));
    return res.json({ success: true, data: { message: 'Deleted successfully' } });
  } catch (err) { next(err); }
}

module.exports = { create, getById, list, update, remove, ShelterCreateSchema };
