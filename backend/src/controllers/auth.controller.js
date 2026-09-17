'use strict';

const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { z }   = require('zod');
const User    = require('../models/User');
const { getEnv }     = require('../config/env');
const { createError } = require('../middleware/errorHandler');

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const RegisterSchema = z.object({
  name:     z.string().min(2).max(80),
  email:    z.string().email(),
  password: z.string().min(8).max(128),
  role:     z.enum(['engineer', 'reviewer', 'admin']).default('engineer'),
});

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function signToken(user) {
  const { JWT_SECRET, JWT_EXPIRES_IN } = getEnv();
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// ─── Controllers ─────────────────────────────────────────────────────────────

async function register(req, res, next) {
  try {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) return next(createError(422, 'VALIDATION_ERROR', 'Invalid registration data', parsed.error.errors));

    const { name, email, password, role } = parsed.data;

    const existing = await User.findOne({ email });
    if (existing) return next(createError(409, 'DUPLICATE_EMAIL', 'Email already registered'));

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role });

    const token = signToken(user);
    return res.status(201).json({
      success: true,
      data: { token, user: { id: user._id, name, email, role } },
    });
  } catch (err) { next(err); }
}

async function login(req, res, next) {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) return next(createError(422, 'VALIDATION_ERROR', 'Invalid login data', parsed.error.errors));

    const { email, password } = parsed.data;

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !user.isActive) return next(createError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'));

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return next(createError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'));

    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    const token = signToken(user);
    return res.json({
      success: true,
      data: { token, user: { id: user._id, name: user.name, email, role: user.role } },
    });
  } catch (err) { next(err); }
}

async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return next(createError(404, 'USER_NOT_FOUND', 'User not found'));
    return res.json({ success: true, data: { user } });
  } catch (err) { next(err); }
}

module.exports = { register, login, getMe };
