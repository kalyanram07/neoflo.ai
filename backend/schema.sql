-- schema.sql: Database tables and indexes for Visual AI Backend Ingestion

CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  page_url TEXT NOT NULL,
  page_title TEXT,
  details TEXT,
  timestamp TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS screenshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_url TEXT NOT NULL,
  page_title TEXT,
  base64_image TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  trigger_reason TEXT,
  timestamp TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Feature 7: Performance Indexing
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_url ON activity_logs (page_url);
CREATE INDEX IF NOT EXISTS idx_screenshots_timestamp ON screenshots (timestamp);
CREATE INDEX IF NOT EXISTS idx_screenshots_url ON screenshots (page_url);
