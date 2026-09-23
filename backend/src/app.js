'use strict';

const express      = require('express');
const cors         = require('cors');
const morgan       = require('morgan');
const errorHandler = require('./middleware/errorHandler');

// ─── Route imports ────────────────────────────────────────────────────────────
const authRoutes     = require('./routes/auth.routes');
const shelterRoutes  = require('./routes/shelter.routes');
const simulateRoutes = require('./routes/simulate.routes');
const runsRoutes     = require('./routes/runs.routes');
const optimizeRoutes = require('./routes/optimize.routes');
const mlRoutes       = require('./routes/ml.routes');

function createApp() {
  const app = express();

  // ── Core middleware ─────────────────────────────────────────────────────
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // ── Health check ────────────────────────────────────────────────────────
  app.get('/health', (req, res) => {
    res.json({
      success: true,
      service: 'AeroTwin-Habitat Backend',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // ── API Routes ──────────────────────────────────────────────────────────
  app.use('/api/v1/auth',     authRoutes);
  app.use('/api/v1/shelters', shelterRoutes);
  app.use('/api/v1/simulate', simulateRoutes);
  app.use('/api/v1/runs',     runsRoutes);
  app.use('/api/v1/optimize', optimizeRoutes);
  app.use('/api/v1/ml',       mlRoutes);

  // ── 404 handler ─────────────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
    });
  });

  // ── Centralized error handler (must be last) ─────────────────────────────
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
