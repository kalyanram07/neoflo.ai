# Visual AI Agent Monorepo

Visual AI Chrome Extension and Backend Ingestion Pipeline monorepo.

## Project Structure
- `/extension`: Manifest V3 Chrome Extension (DOM listener, Offscreen Visual Frame Capture, Throttling Manager, Popup UI).
- `/backend`: Node.js Express server with SQLite storage and Jest API ingestion test suite.

## Development & Testing
### Backend Setup
```bash
cd backend
npm install
npm test
npm start
```
### Extension Setup
1. Open Chrome and navigate to `chrome://extensions`.
2. Enable "Developer mode".
3. Click "Load unpacked" and select the `extension/` directory.
