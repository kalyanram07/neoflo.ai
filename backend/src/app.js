// app.js - Express Server Definition & Ingestion Routes

const express = require('express');
const cors = require('cors');
const DatabaseManager = require('./db');

function createApp(dbManager) {
  const app = express();

  // Middleware - Enable CORS and large payload body-parser (50MB for Base64 visual frames)
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Health Check Endpoint
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'visual-ai-backend', timestamp: new Date().toISOString() });
  });

  // POST /api/activity - DOM Activity Ingestion Endpoint
  app.post('/api/activity', async (req, res) => {
    try {
      const { eventType, pageUrl, pageTitle, timestamp, details } = req.body;

      if (!eventType || !pageUrl) {
        return res.status(400).json({ error: 'eventType and pageUrl are required fields' });
      }

      const sql = `
        INSERT INTO activity_logs (event_type, page_url, page_title, details, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `;
      const result = await dbManager.run(sql, [
        eventType,
        pageUrl,
        pageTitle || '',
        JSON.stringify(details || {}),
        timestamp || new Date().toISOString()
      ]);

      res.status(201).json({
        success: true,
        message: 'Activity log ingested successfully',
        logId: result.id
      });
    } catch (err) {
      console.error('Error inserting activity log:', err);
      res.status(500).json({ error: 'Failed to ingest activity log' });
    }
  });

  // POST /api/capture - Visual Frame Screenshot Ingestion Endpoint
  app.post('/api/capture', async (req, res) => {
    try {
      const { pageUrl, pageTitle, base64Image, width, height, triggerReason, timestamp } = req.body;

      if (!pageUrl || !base64Image) {
        return res.status(400).json({ error: 'pageUrl and base64Image are required fields' });
      }

      const sql = `
        INSERT INTO screenshots (page_url, page_title, base64_image, width, height, trigger_reason, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const result = await dbManager.run(sql, [
        pageUrl,
        pageTitle || '',
        base64Image,
        width || 0,
        height || 0,
        triggerReason || 'automated',
        timestamp || new Date().toISOString()
      ]);

      res.status(201).json({
        success: true,
        message: 'Visual frame screenshot ingested successfully',
        screenshotId: result.id
      });
    } catch (err) {
      console.error('Error inserting screenshot:', err);
      res.status(500).json({ error: 'Failed to ingest screenshot' });
    }
  });

  // GET /api/logs - Query stored activity logs and screenshots
  app.get('/api/logs', async (req, res) => {
    try {
      const activities = await dbManager.all('SELECT id, event_type, page_url, page_title, details, timestamp, created_at FROM activity_logs ORDER BY id DESC LIMIT 50');
      const screenshots = await dbManager.all('SELECT id, page_url, page_title, width, height, trigger_reason, timestamp, created_at FROM screenshots ORDER BY id DESC LIMIT 50');

      // Parse JSON details
      const parsedActivities = activities.map((a) => {
        try {
          return { ...a, details: JSON.parse(a.details) };
        } catch {
          return a;
        }
      });

      res.status(200).json({
        activityLogs: parsedActivities,
        screenshots: screenshots,
        totalActivityLogs: parsedActivities.length,
        totalScreenshots: screenshots.length
      });
    } catch (err) {
      console.error('Error querying logs:', err);
      res.status(500).json({ error: 'Failed to query logs' });
    }
  });

  return app;
}

module.exports = createApp;
