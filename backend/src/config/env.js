'use strict';

require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  REPORTS_DIR: z.string().default('./reports'),
  EXPORTS_DIR: z.string().default('./exports'),
});

let _env;

function getEnv() {
  if (_env) return _env;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌  Invalid environment configuration:');
    result.error.errors.forEach((e) => console.error(`   ${e.path.join('.')}: ${e.message}`));
    process.exit(1);
  }
  _env = result.data;
  return _env;
}

module.exports = { getEnv };
