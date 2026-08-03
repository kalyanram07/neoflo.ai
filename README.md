# 👁️ Visual AI Agent & Backend Ingestion Monorepo

> A high-performance Chrome Extension (Manifest V3) and Express/SQLite backend pipeline for capturing live DOM interaction events, throttling visual frame captures, converting visual frames into base64 encodings via an offscreen document, and ingesting telemetry logs for AI visual agent analysis.

---

## 🌟 Key Features

- **Manifest V3 Architecture**: Fully compliant Chrome Extension utilizing background service workers and offscreen document host pages.
- **Offscreen Frame Processing**: Bypasses service worker canvas limitations by offloading tab screenshot rendering and Base64 conversion to `offscreen.html`.
- **Frame Throttling Engine**: Built-in 1000ms frame throttling in `background.js` to avoid network/memory congestion while maintaining continuous visual telemetry.
- **DOM Activity Tracking**: `content.js` captures clicks, keypresses, input changes (with password redaction), and scroll actions with full target selector context.
- **50MB Base64 Payload Ingestion**: Node.js / Express backend with custom JSON body limits to support large visual image frames.
- **Embedded SQLite Telemetry Store**: Zero-dependency SQLite schema storing structured `activity_logs` and `screenshots`.
- **Extension Status Popup UI**: Dark-themed control popup to toggle capture status, view live telemetry counts, set backend API URL, and trigger manual frame captures.
- **Comprehensive Unit Testing**: Jest + Supertest test suite ensuring 100% endpoint reliability.
- **Preserved Git Branch Tree**: Built with unsquashed feature branches (`feature/extension-setup`, `feature/visual-capture`, `feature/backend-db`) merged via `git merge --no-ff`.

---

## 📁 Repository Structure

```text
neoflo.ai/
├── extension/                 # Manifest V3 Chrome Extension
│   ├── manifest.json          # Manifest V3 definition (offscreen, activeTab, storage)
│   ├── background.js         # Service Worker (offscreen manager, throttling engine)
│   ├── content.js            # DOM interaction event listener
│   ├── offscreen.html        # Offscreen document host page
│   ├── offscreen.js          # Canvas rendering & Base64 encoder engine
│   └── popup/                # Extension Control UI
│       ├── popup.html
│       ├── popup.css
│       └── popup.js
├── backend/                   # Node.js Ingestion Pipeline
│   ├── package.json           # Node.js dependencies (Express, SQLite3, Jest, Supertest)
│   ├── schema.sql             # Database table definitions
│   ├── src/
│   │   ├── app.js             # Express app & ingestion API routes
│   │   ├── db.js              # SQLite database manager
│   │   └── server.js          # HTTP server listener (Port 3000)
│   └── tests/
│       └── ingestion.test.js  # Jest unit test suite
├── .gitignore
└── README.md
```

---

## ⚡ Backend Ingestion API Reference

### Health Check
- `GET /api/health`
- **Response**: `200 OK`
  ```json
  {
    "status": "ok",
    "service": "visual-ai-backend",
    "timestamp": "2026-08-03T09:50:49.352Z"
  }
  ```

### Ingest DOM Activity Log
- `POST /api/activity`
- **Payload**:
  ```json
  {
    "eventType": "click",
    "pageUrl": "https://example.com/demo",
    "pageTitle": "Demo Page",
    "timestamp": "2026-08-03T10:00:00.000Z",
    "details": {
      "target": "#submit-btn",
      "text": "Submit Form"
    }
  }
  ```
- **Response**: `201 Created` (`{ "success": true, "logId": 1 }`)

### Ingest Base64 Visual Screenshot
- `POST /api/capture`
- **Payload**:
  ```json
  {
    "pageUrl": "https://example.com/demo",
    "pageTitle": "Demo Page",
    "base64Image": "data:image/png;base64,iVBORw0KGgo...",
    "width": 1280,
    "height": 720,
    "triggerReason": "automated",
    "timestamp": "2026-08-03T10:00:00.000Z"
  }
  ```
- **Response**: `201 Created` (`{ "success": true, "screenshotId": 1 }`)

### Query Stored Telemetry Logs
- `GET /api/logs`
- **Response**: `200 OK` (returns list of activity logs and screenshot metadata records)

---

## 🛠️ Quick Start Guide

### 1. Start Backend Ingestion Server
```bash
cd backend
npm install
npm test      # Execute Jest unit test suite
npm start     # Starts server on http://localhost:3000
```

### 2. Load Extension into Chrome
1. Open Google Chrome and navigate to `chrome://extensions`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `/extension` directory from this repository.
4. Open any website and click the **Visual AI Agent** extension icon to view live event logs and frame captures.

---

## 🧪 Unit Testing

Run automated tests from the `/backend` directory:
```bash
cd backend
npm test
```

Test output:
```text
PASS tests/ingestion.test.js
  Visual AI Ingestion API Unit Tests
    √ GET /api/health should return status 200 and healthy response
    √ POST /api/activity should ingest valid DOM activity log
    √ POST /api/activity should return 400 when missing required fields
    √ POST /api/capture should ingest base64 screenshot visual frame
    √ POST /api/capture should return 400 when missing base64Image
    √ GET /api/logs should return stored activity logs and screenshot metadata
```

---

## 🌳 Git Commit Tree Graph

The commit history was maintained with feature branches merged using `--no-ff`:

```text
*   3acd570 merge: merge feature/backend-db into main
|\  
| * 5f158d0 feat(backend-db): implement Express backend ingestion API, SQLite DB manager, schema, and Jest unit test suite
|/  
*   96caad4 merge: merge feature/visual-capture into main
|\  
| * 734bf49 feat(visual-capture): implement offscreen frame capture, throttling, and base64 encoding manager
|/  
*   82a4764 merge: merge feature/extension-setup into main
|\  
| * dddb03e feat(extension): implement extension setup with manifest, content script, and popup UI
|/  
* 4c914bc init: initialize project root
```
