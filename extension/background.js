// background.js - Service Worker & Throttling Engine for Visual AI Agent

const DEFAULT_SERVER_URL = 'http://localhost:3000';
const CAPTURE_THROTTLE_MS = 1000; // Throttling: max 1 frame per 1000ms
let lastCaptureTime = 0;
let isOffscreenCreating = false;

// Ensure offscreen document exists
async function setupOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });

  if (existingContexts.length > 0) {
    return;
  }

  if (isOffscreenCreating) return;
  isOffscreenCreating = true;

  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA', 'DISPLAY_MEDIA', 'BLOBS'],
      justification: 'Process frame capture and convert visual frame to base64 encoding'
    });
  } catch (err) {
    if (!err.message.includes('Only a single offscreen document may be created')) {
      console.error('[Visual AI Agent] Failed to create offscreen document:', err);
    }
  } finally {
    isOffscreenCreating = false;
  }
}

// Fetch configured backend URL
async function getServerUrl() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['serverUrl'], (res) => {
      resolve(res.serverUrl || DEFAULT_SERVER_URL);
    });
  });
}

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
      // Increment stored counter for popup UI
      chrome.storage.local.get(['logCount'], (r) => {
        const count = (r.logCount || 0) + 1;
        chrome.storage.local.set({ logCount: count });
      });
    }
  } catch (err) {
    console.warn('[Visual AI Agent] Could not reach backend activity API:', err.message);
  }
}

// Perform Throttled Frame Capture
async function captureTabFrame(triggerReason = 'automated') {
  const now = Date.now();
  if (now - lastCaptureTime < CAPTURE_THROTTLE_MS && triggerReason !== 'manual') {
    return { throttled: true };
  }
  lastCaptureTime = now;

  try {
    await setupOffscreenDocument();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
      return { skipped: true, reason: 'restricted_url' };
    }

    // Capture tab screenshot as data URL
    const rawDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
    if (!rawDataUrl) return { skipped: true, reason: 'no_capture' };

    // Send raw frame to offscreen for canvas processing & base64 encoding
    const response = await chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'PROCESS_FRAME',
      dataUrl: rawDataUrl,
      maxWidth: 1280
    });

    if (response && response.success) {
      const serverUrl = await getServerUrl();
      const capturePayload = {
        pageUrl: tab.url,
        pageTitle: tab.title || '',
        base64Image: response.base64Image,
        width: response.width,
        height: response.height,
        timestamp: response.timestamp,
        triggerReason
      };

      const res = await fetch(`${serverUrl}/api/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(capturePayload)
      });

      if (res.ok) {
        chrome.storage.local.get(['frameCount'], (r) => {
          const count = (r.frameCount || 0) + 1;
          chrome.storage.local.set({ frameCount: count });
        });
        return { success: true };
      }
    }
  } catch (err) {
    console.error('[Visual AI Agent] Error capturing tab frame:', err);
    return { success: false, error: err.message };
  }

  return { success: false };
}

// Message Listener for Content Script and Popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'DOM_ACTIVITY') {
    sendActivityToBackend(message.payload);

    // Optionally trigger a throttled visual frame capture on important user events
    if (['click', 'keydown'].includes(message.payload.eventType)) {
      captureTabFrame('event_triggered');
    }
    return false;
  }

  if (message.type === 'MANUAL_CAPTURE') {
    captureTabFrame('manual').then((res) => sendResponse(res));
    return true; // async response
  }
});

console.log('[Visual AI Agent] Background service worker initialized with throttling (1000ms).');
