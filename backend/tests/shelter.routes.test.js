'use strict';

/**
 * Shelter CRUD Route Tests — AeroTwin-Habitat
 * Uses Supertest + Jest with an in-memory MongoDB mock via Jest setup.
 */

const request  = require('supertest');
const mongoose = require('mongoose');
const { createApp } = require('../src/app');

// ─── Test app + MongoDB ───────────────────────────────────────────────────────

let app;
let authToken;
let createdShelterId;

const MONGO_URI = (process.env.MONGO_URI && process.env.MONGO_URI.includes('mongodb+srv'))
  ? process.env.MONGO_URI.replace('AERO_TWIN', 'AERO_TWIN_TEST')
  : 'mongodb+srv://dev_tamanna:tannu123@cluster0.d1xtk5s.mongodb.net/AERO_TWIN_TEST';

const TEST_USER = {
  name:     'Test Engineer',
  email:    'test.engineer@aerotwin.test',
  password: 'testpassword123',
  role:     'engineer',
};

const SAMPLE_SHELTER = {
  name: 'Test Shelter Alpha',
  location: {
    name:       'Leh',
    lat:         34.15,
    lon:         77.58,
    altitude_m:  3500,
  },
  geometry: {
    length_m:  6,
    width_m:   4,
    height_m:  3,
    orientation_deg: 180,
  },
  envelope: {
    roof: {
      uValue:      0.2,
      thickness_m: 0.1,
      material:    'insulated_panel',
    },
    walls: {
      uValue:      0.3,
      thickness_m: 0.08,
      material:    'insulated_panel',
    },
    floor: {
      uValue:      0.25,
      thickness_m: 0.08,
      material:    'insulated_panel',
    },
    glazing: {
      area_m2: 2.0,
      uValue:  1.5,
      shgc:    0.4,
    },
  },
  pcm: {
    present:         true,
    meltPoint_C:     28,
    latentHeat_kJkg: 200,
    mass_kg:         50,
  },
  infiltrationRateACH: 0.5,
  internalGainsW:      200,
  massConstraintKg:    1500,
};

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  process.env.MONGO_URI   = MONGO_URI;
  process.env.JWT_SECRET  = 'test-jwt-secret-at-least-32-characters-long';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.NODE_ENV    = 'test';
  process.env.REPORTS_DIR = './test_reports';
  process.env.EXPORTS_DIR = './test_exports';

  await mongoose.connect(MONGO_URI);
  app = createApp();

  // Register and login
  await request(app).post('/api/v1/auth/register').send(TEST_USER);
  const loginRes = await request(app).post('/api/v1/auth/login').send({
    email: TEST_USER.email, password: TEST_USER.password,
  });
  authToken = loginRes.body.data?.token;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/v1/shelters', () => {
  it('creates a shelter config and returns 201', async () => {
    const res = await request(app)
      .post('/api/v1/shelters')
      .set('Authorization', `Bearer ${authToken}`)
      .send(SAMPLE_SHELTER);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.config).toHaveProperty('_id');
    expect(res.body.data.config.name).toBe('Test Shelter Alpha');
    createdShelterId = res.body.data.config._id;
  });

  it('returns 422 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/shelters')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Incomplete' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).post('/api/v1/shelters').send(SAMPLE_SHELTER);
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/shelters/:id', () => {
  it('returns the created shelter', async () => {
    const res = await request(app)
      .get(`/api/v1/shelters/${createdShelterId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.config._id).toBe(createdShelterId);
    expect(res.body.data.config.pcm.present).toBe(true);
  });

  it('returns 404 for non-existent ID', async () => {
    const res = await request(app)
      .get('/api/v1/shelters/000000000000000000000000')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(404);
  });
});

describe('GET /api/v1/shelters', () => {
  it('returns paginated list', async () => {
    const res = await request(app)
      .get('/api/v1/shelters?page=1&limit=10')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.configs)).toBe(true);
    expect(res.body.data.total).toBeGreaterThanOrEqual(1);
  });
});

describe('PUT /api/v1/shelters/:id', () => {
  it('updates shelter name', async () => {
    const res = await request(app)
      .put(`/api/v1/shelters/${createdShelterId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Updated Shelter Alpha' });

    expect(res.status).toBe(200);
    expect(res.body.data.config.name).toBe('Updated Shelter Alpha');
  });
});

describe('DELETE /api/v1/shelters/:id', () => {
  it('returns 403 for non-admin user', async () => {
    const res = await request(app)
      .delete(`/api/v1/shelters/${createdShelterId}`)
      .set('Authorization', `Bearer ${authToken}`);
    // engineer role cannot delete (admin only)
    expect(res.status).toBe(403);
  });
});

describe('Auth endpoints', () => {
  it('login returns JWT token', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: TEST_USER.email, password: TEST_USER.password,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
  });

  it('login fails with wrong password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: TEST_USER.email, password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });

  it('GET /me returns user info', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(TEST_USER.email);
  });
});
