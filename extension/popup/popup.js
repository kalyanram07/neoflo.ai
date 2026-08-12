document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggleBtn');
  const captureNowBtn = document.getElementById('captureNowBtn');
  const serverUrlInput = document.getElementById('serverUrl');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const logCountEl = document.getElementById('logCount');
  const frameCountEl = document.getElementById('frameCount');
  const queueCountEl = document.getElementById('queueCount');

  let isCapturing = true;

  // Load stored settings and stats
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['isCapturing', 'serverUrl', 'logCount', 'frameCount', 'pendingQueue'], (res) => {
      if (res.isCapturing !== undefined) {
        isCapturing = res.isCapturing;
        updateUI();
      }
      if (res.serverUrl) {
        serverUrlInput.value = res.serverUrl;
      }
      if (res.logCount !== undefined) logCountEl.textContent = res.logCount;
      if (res.frameCount !== undefined) frameCountEl.textContent = res.frameCount;
      if (res.pendingQueue) queueCountEl.textContent = res.pendingQueue.length;
    });
  }

  function updateUI() {
    if (isCapturing) {
      statusDot.className = 'dot';
      statusText.textContent = 'Active & Listening';
      toggleBtn.textContent = 'Pause Capture';
      toggleBtn.className = 'btn primary';
    } else {
      statusDot.className = 'dot paused';
      statusText.textContent = 'Capture Paused';
      toggleBtn.textContent = 'Resume Capture';
      toggleBtn.className = 'btn secondary';
    }
  }

  toggleBtn.addEventListener('click', () => {
    isCapturing = !isCapturing;
    updateUI();
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ isCapturing });
    }
  });

  serverUrlInput.addEventListener('change', () => {
    const url = serverUrlInput.value.trim();
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ serverUrl: url });
    }
  });

  captureNowBtn.addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: 'MANUAL_CAPTURE' }, (response) => {
        if (chrome.runtime.lastError) return;
        if (response && response.success) {
          const current = parseInt(frameCountEl.textContent, 10) || 0;
          frameCountEl.textContent = current + 1;
        }
      });
    }
  });
});
