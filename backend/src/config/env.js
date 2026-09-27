'use strict';

require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGO_URI: z.string().default('mongodb://127.0.0.1:27017/aerotwin_habitat'),
  JWT_SECRET: z.string().default('aerotwin_default_secret_production_key_64_bytes_secure_string_2026'),
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
