'use strict';

const http = require('http');
const { getEnv }   = require('./config/env');
const { connectDB } = require('./config/db');
const { createApp } = require('./app');
const wsManager    = require('./websocket/simulateSocket');
const fs           = require('fs');
const path         = require('path');

async function bootstrap() {
  const env = getEnv();

  // ── Connect to MongoDB ──────────────────────────────────────────────────
  await connectDB();

  // ── Ensure output directories exist ────────────────────────────────────
  const dirs = [env.REPORTS_DIR, env.EXPORTS_DIR];
  dirs.forEach((d) => {
    const resolved = path.resolve(d);
    if (!fs.existsSync(resolved)) fs.mkdirSync(resolved, { recursive: true });
  });

  // ── Create Express app ──────────────────────────────────────────────────
  const app    = createApp();
  const server = http.createServer(app);

  // ── Attach WebSocket server ─────────────────────────────────────────────
  wsManager.init(server);

  // ── Start listening ─────────────────────────────────────────────────────
  const PORT = Number(env.PORT) || 5000;
  server.listen(PORT, () => {
    console.log(`\n🚀  AeroTwin-Habitat API running on http://localhost:${PORT}`);
    console.log(`🔌  WebSocket on ws://localhost:${PORT}/ws/simulate/:runId`);
    console.log(`🌍  Environment: ${env.NODE_ENV}`);
    console.log(`📂  Reports dir: ${path.resolve(env.REPORTS_DIR)}`);
    console.log(`📂  Exports dir: ${path.resolve(env.EXPORTS_DIR)}\n`);
  });

  // ── Graceful shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal) => {
    console.log(`\n⚡  ${signal} received — shutting down gracefully...`);
    server.close(() => {
      const mongoose = require('mongoose');
      mongoose.disconnect().then(() => {
        console.log('✅  MongoDB disconnected. Bye!');
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('❌  Server startup failed:', err);
  process.exit(1);
});
