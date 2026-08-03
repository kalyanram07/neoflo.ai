// content.js - DOM Activity Listener for Visual AI Agent

(function () {
  let isCapturing = true;

  // Sync state with extension storage
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['isCapturing'], (res) => {
      if (res.isCapturing !== undefined) {
        isCapturing = res.isCapturing;
      }
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.isCapturing) {
        isCapturing = changes.isCapturing.newValue;
      }
    });
  }

  function getElementSelector(el) {
    if (!el || el === document) return 'document';
    if (el.id) return `#${el.id}`;
    let sel = el.tagName ? el.tagName.toLowerCase() : 'element';
    if (el.className && typeof el.className === 'string' && el.className.trim()) {
      sel += `.${el.className.trim().split(/\s+/).join('.')}`;
    }
    return sel;
  }

  function sendActivity(eventType, details) {
    if (!isCapturing) return;

    const payload = {
      eventType,
      pageUrl: window.location.href,
      pageTitle: document.title,
      timestamp: new Date().toISOString(),
      details
    };

    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'DOM_ACTIVITY', payload });
      }
    } catch (err) {
      console.warn('[Visual AI Agent] Error sending DOM activity message:', err);
    }
  }

  // Click event listener
  document.addEventListener('click', (e) => {
    const target = e.target;
    sendActivity('click', {
      target: getElementSelector(target),
      tagName: target ? target.tagName : '',
      text: target ? (target.innerText || target.value || '').substring(0, 100) : '',
      x: e.clientX,
      y: e.clientY
    });
  }, true);

  // Input event listener
  document.addEventListener('change', (e) => {
    const target = e.target;
    if (!target) return;
    const isPassword = target.type === 'password';
    sendActivity('input_change', {
      target: getElementSelector(target),
      name: target.name || target.id || '',
      valueLength: target.value ? target.value.length : 0,
      value: isPassword ? '[REDACTED]' : (target.value || '').substring(0, 100)
    });
  }, true);

  // Keydown listener for key actions
  document.addEventListener('keydown', (e) => {
    if (['Enter', 'Tab', 'Escape'].includes(e.key)) {
      sendActivity('keydown', {
        key: e.key,
        target: getElementSelector(e.target)
      });
    }
  }, true);

  // Throttled scroll listener
  let scrollTimeout = null;
  window.addEventListener('scroll', () => {
    if (scrollTimeout) return;
    scrollTimeout = setTimeout(() => {
      scrollTimeout = null;
      sendActivity('scroll', {
        scrollX: window.scrollX,
        scrollY: window.scrollY
      });
    }, 500);
  }, { passive: true });

  console.log('[Visual AI Agent] Content script loaded & listening for DOM activity.');
})();
