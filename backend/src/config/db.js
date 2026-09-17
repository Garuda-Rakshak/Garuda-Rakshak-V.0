'use strict';

const mongoose = require('mongoose');
const { getEnv } = require('./env');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

async function connectDB(retries = 0) {
  const { MONGO_URI, NODE_ENV } = getEnv();
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    if (NODE_ENV !== 'test') {
      console.log(`✅  MongoDB connected: ${mongoose.connection.host}`);
    }
  } catch (err) {
    if (retries < MAX_RETRIES) {
      console.warn(`⚠️  MongoDB connection failed (attempt ${retries + 1}/${MAX_RETRIES}). Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      return connectDB(retries + 1);
    }
    console.error('❌  MongoDB connection failed after max retries:', err.message);
    process.exit(1);
  }
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
