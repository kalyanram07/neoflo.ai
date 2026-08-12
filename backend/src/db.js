// db.js - SQLite Database Driver & Schema Initializer with Pruning Support

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseManager {
  constructor(dbPath = null) {
    this.dbPath = dbPath || process.env.DB_PATH || path.join(__dirname, '..', 'database.sqlite');
    this.db = null;
  }

  init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) return reject(err);

        const schemaPath = path.join(__dirname, '..', 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        this.db.exec(schemaSql, (execErr) => {
          if (execErr) return reject(execErr);
          resolve(this);
        });
      });
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  // Feature 7: Automated Retention Cleanup & Data Pruning
  async pruneOldData(maxRecords = 500) {
    try {
      // Prune old activity logs keeping maxRecords
      await this.run(
        `DELETE FROM activity_logs WHERE id NOT IN (SELECT id FROM activity_logs ORDER BY id DESC LIMIT ?)`,
        [maxRecords]
      );

      // Prune old screenshots keeping maxRecords
      await this.run(
        `DELETE FROM screenshots WHERE id NOT IN (SELECT id FROM screenshots ORDER BY id DESC LIMIT ?)`,
        [maxRecords]
      );

      return { success: true };
    } catch (err) {
      console.error('Error during database pruning:', err);
      return { success: false, error: err.message };
    }
  }

  close() {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve();
      this.db.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}

module.exports = DatabaseManager;
