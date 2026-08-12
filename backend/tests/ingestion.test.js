// ingestion.test.js - Ingestion API & V2 Feature Unit Test Suite

const request = require('supertest');
const createApp = require('../src/app');
const DatabaseManager = require('../src/db');

describe('Visual AI Ingestion API & V2 Features Unit Tests', () => {
  let dbManager;
  let app;

  beforeAll(async () => {
    dbManager = new DatabaseManager(':memory:');
    await dbManager.init();
    app = createApp(dbManager);
  });

  afterAll(async () => {
    await dbManager.close();
  });

  test('GET /api/health should return status 200 and healthy response', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('service', 'visual-ai-backend');
  });

  test('GET /dashboard should serve live dashboard html page', async () => {
    const res = await request(app).get('/dashboard');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('Visual AI Telemetry Live Dashboard');
  });

  test('GET /api/stream should setup SSE event stream headers', async () => {
    const res = await request(app)
      .get('/api/stream')
      .set('Accept', 'text/event-stream');

    expect(res.statusCode).toEqual(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
  });

  test('POST /api/activity should ingest valid DOM activity log', async () => {
    const payload = {
      eventType: 'click',
      pageUrl: 'https://example.com/demo',
      pageTitle: 'Demo Page',
      timestamp: new Date().toISOString(),
      details: { target: '#submit-btn', text: 'Submit' }
    };

    const res = await request(app)
      .post('/api/activity')
      .send(payload);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('logId');
  });

  test('POST /api/activity should return 400 when missing required fields', async () => {
    const res = await request(app)
      .post('/api/activity')
      .send({ eventType: 'click' });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/capture should ingest WebP base64 screenshot visual frame', async () => {
    const sampleWebP = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/v38gAA=';

    const payload = {
      pageUrl: 'https://example.com/demo',
      pageTitle: 'Demo Page',
      base64Image: sampleWebP,
      width: 1280,
      height: 720,
      triggerReason: 'automated',
      timestamp: new Date().toISOString()
    };

    const res = await request(app)
      .post('/api/capture')
      .send(payload);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('screenshotId');
  });

  test('GET /api/logs should return stored activity logs and screenshot metadata', async () => {
    const res = await request(app).get('/api/logs');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('activityLogs');
    expect(res.body).toHaveProperty('screenshots');
    expect(Array.isArray(res.body.activityLogs)).toBe(true);
    expect(Array.isArray(res.body.screenshots)).toBe(true);
  });

  test('dbManager.pruneOldData should execute data pruning successfully', async () => {
    const pruneRes = await dbManager.pruneOldData(10);
    expect(pruneRes).toHaveProperty('success', true);
  });
});
