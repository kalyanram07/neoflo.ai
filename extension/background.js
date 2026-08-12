// background.js - Adaptive Throttling & Offline Retry Engine for Visual AI Agent

const DEFAULT_SERVER_URL = 'http://localhost:3000';
const ACTIVE_THROTTLE_MS = 500;  // 500ms throttle for user interactions
const IDLE_THROTTLE_MS = 3000;   // 3000ms throttle for passive captures

let lastCaptureTime = 0;
let isOffscreenCreating = false;
let isTabHidden = false;

// Ensure offscreen document exists safely across all Chrome versions
async function setupOffscreenDocument() {
  if (chrome.runtime && chrome.runtime.getContexts) {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });
    if (existingContexts.length > 0) return;
  }

  if (isOffscreenCreating) return;
  isOffscreenCreating = true;

  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['BLOBS', 'DOM_PARSER'],
      justification: 'Process frame capture, render AI bounding boxes, and compress WebP image'
    });
  } catch (err) {
    if (!err.message.includes('Only a single offscreen document may be created')) {
      console.error('[Visual AI Agent] Failed to create offscreen document:', err);
    }
  } finally {
    isOffscreenCreating = false;
  }
}

async function getServerUrl() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['serverUrl'], (res) => {
      resolve(res.serverUrl || DEFAULT_SERVER_URL);
    });
  });
}

// Feature 4: Save payload to offline queue if server is unreachable
function saveToOfflineQueue(endpoint, payload) {
  chrome.storage.local.get(['pendingQueue'], (res) => {
    const queue = res.pendingQueue || [];
    queue.push({ endpoint, payload, createdAt: new Date().toISOString() });
    if (queue.length > 100) queue.shift();
    chrome.storage.local.set({ pendingQueue: queue });
    console.log(`[Visual AI Agent] Saved item to offline queue. Queue length: ${queue.length}`);
  });
}

// Feature 4: Flush offline queue when reconnected
async function flushPendingQueue() {
  chrome.storage.local.get(['pendingQueue'], async (res) => {
    const queue = res.pendingQueue || [];
    if (queue.length === 0) return;

    console.log(`[Visual AI Agent] Attempting to flush ${queue.length} offline queued items...`);
    const serverUrl = await getServerUrl();
    const remainingQueue = [];

    for (const item of queue) {
      try {
        const response = await fetch(`${serverUrl}${item.endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload)
        });
        if (!response.ok) {
          remainingQueue.push(item);
        }
      } catch (err) {
        remainingQueue.push(item);
      }
    }

    chrome.storage.local.set({ pendingQueue: remainingQueue });
  });
}

setInterval(flushPendingQueue, 15000);

// Send DOM Activity log to Backend API
async function sendActivityToBackend(payload) {
  const serverUrl = await getServerUrl();
  try {
    const res = await fetch(`${serverUrl}/api/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      chrome.storage.local.get(['logCount'], (r) => {
        chrome.storage.local.set({ logCount: (r.logCount || 0) + 1 });
      });
      flushPendingQueue();
    } else {
      saveToOfflineQueue('/api/activity', payload);
    }
  } catch (err) {
    saveToOfflineQueue('/api/activity', payload);
  }
}

// Feature 5: Perform Adaptive Throttled Frame Capture
async function captureTabFrame(triggerReason = 'automated', elementRect = null, actionLabel = '') {
  if (isTabHidden && triggerReason !== 'manual') {
    return { skipped: true, reason: 'tab_hidden' };
  }

  const requiredThrottle = triggerReason === 'event_triggered' ? ACTIVE_THROTTLE_MS : IDLE_THROTTLE_MS;
  const now = Date.now();

  if (now - lastCaptureTime < requiredThrottle && triggerReason !== 'manual') {
    return { throttled: true };
  }
  lastCaptureTime = now;

  try {
    await setupOffscreenDocument();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
      return { skipped: true, reason: 'restricted_url' };
    }

    const rawDataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });
    if (!rawDataUrl) return { skipped: true, reason: 'no_capture' };

    const response = await chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'PROCESS_FRAME',
      dataUrl: rawDataUrl,
      maxWidth: 1280,
      elementRect,
      actionLabel
    });

    if (response && response.success) {
      const serverUrl = await getServerUrl();
      const capturePayload = {
        pageUrl: tab.url,
        pageTitle: tab.title || '',
        base64Image: response.base64Image,
        width: response.width,
        height: response.height,
        triggerReason,
        timestamp: response.timestamp
      };

      try {
        const res = await fetch(`${serverUrl}/api/capture`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(capturePayload)
        });

        if (res.ok) {
          chrome.storage.local.get(['frameCount'], (r) => {
            chrome.storage.local.set({ frameCount: (r.frameCount || 0) + 1 });
          });
          return { success: true };
        } else {
          saveToOfflineQueue('/api/capture', capturePayload);
        }
      } catch {
        saveToOfflineQueue('/api/capture', capturePayload);
      }
    }
  } catch (err) {
    console.error('[Visual AI Agent] Error capturing tab frame:', err);
    return { success: false, error: err.message };
  }

  return { success: false };
}

// Message Listener for Content Script & Popup UI
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'DOM_ACTIVITY') {
    sendActivityToBackend(message.payload);

    if (['click', 'keydown', 'input_change'].includes(message.payload.eventType)) {
      const label = `${message.payload.eventType.toUpperCase()}: ${message.payload.details.target || 'ELEMENT'}`;
      captureTabFrame('event_triggered', message.payload.elementRect, label);
    }
    return false;
  }

  if (message.type === 'VISIBILITY_CHANGE') {
    isTabHidden = !!message.isHidden;
    return false;
  }

  if (message.type === 'MANUAL_CAPTURE') {
    captureTabFrame('manual').then((res) => sendResponse(res));
    return true;
  }
});

console.log('[Visual AI Agent] Service Worker v2 running with adaptive throttling & offline queueing.');
