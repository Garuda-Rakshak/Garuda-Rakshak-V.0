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

const path         = require('path');
const fs           = require('fs');

function findFrontendDist() {
  const candidates = [
    process.env.FRONTEND_DIST,
    path.resolve(__dirname, '../../frontend/dist'),
    path.resolve(process.cwd(), 'frontend/dist'),
    path.resolve(process.cwd(), '../frontend/dist'),
    path.resolve(process.cwd(), 'dist'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'index.html'))) {
      return candidate;
    }
  }
  return null;
}

function createApp() {
  const app = express();
  const frontendDist = findFrontendDist();

  // ── Core middleware ─────────────────────────────────────────────────────
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // ── Serve static frontend assets if built ────────────────────────────────
  if (frontendDist) {
    app.use(express.static(frontendDist));
  }

  // ── Health check ────────────────────────────────────────────────────────
  app.get('/health', (req, res) => {
    res.json({
      success: true,
      service: 'Garuda-Rakshak Airo One Platform',
      status: 'online',
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

  // ── Root / Landing (if no static frontend) ──────────────────────────────
  if (!frontendDist) {
    app.get('/', (req, res) => {
      res.json({
        success: true,
        service: 'Garuda-Rakshak API Server',
        status: 'online',
        version: '1.0.0',
        frontendUrl: 'http://localhost:5173',
        healthCheck: '/health',
        endpoints: '/api/v1/*',
        timestamp: new Date().toISOString(),
      });
    });
  } else {
    // ── SPA Fallback for all other routes ─────────────────────────────────
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path === '/health') {
        return next();
      }
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }

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
