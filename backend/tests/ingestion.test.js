// ingestion.test.js - Ingestion API Unit Test Suite

const request = require('supertest');
const createApp = require('../src/app');
const DatabaseManager = require('../src/db');

describe('Visual AI Ingestion API Unit Tests', () => {
  let dbManager;
  let app;

  beforeAll(async () => {
    // Use in-memory SQLite database for clean test isolation
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
      .send({ eventType: 'click' }); // Missing pageUrl

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/capture should ingest base64 screenshot visual frame', async () => {
    // Sample base64 image data string
    const sampleBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const payload = {
      pageUrl: 'https://example.com/demo',
      pageTitle: 'Demo Page',
      base64Image: sampleBase64,
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

  test('POST /api/capture should return 400 when missing base64Image', async () => {
    const res = await request(app)
      .post('/api/capture')
      .send({ pageUrl: 'https://example.com' });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/logs should return stored activity logs and screenshot metadata', async () => {
    const res = await request(app).get('/api/logs');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('activityLogs');
    expect(res.body).toHaveProperty('screenshots');
    expect(Array.isArray(res.body.activityLogs)).toBe(true);
    expect(Array.isArray(res.body.screenshots)).toBe(true);
    expect(res.body.activityLogs.length).toBeGreaterThan(0);
    expect(res.body.screenshots.length).toBeGreaterThan(0);
  });
});
