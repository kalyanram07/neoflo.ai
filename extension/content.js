// content.js - DOM Activity Listener with PII Masking & Element Bounding Rects

(function () {
  let isCapturing = true;

  // Sync capture state with chrome storage
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

  // Feature 3: PII Redaction Filter
  function sanitizePII(text) {
    if (typeof text !== 'string') return text;
    return text
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
      .replace(/\b(?:\d[ -]*?){13,16}\b/g, '[REDACTED_CARD]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]')
      .replace(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[REDACTED_PHONE]');
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

  // Feature 2: Target Element Bounding Box Computation
  function getElementBounds(el) {
    if (!el || el === document || !el.getBoundingClientRect) return null;
    const rect = el.getBoundingClientRect();
    return {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  }

  function sendActivity(eventType, details, elementRect = null) {
    if (!isCapturing) return;

    const payload = {
      eventType,
      pageUrl: window.location.href,
      pageTitle: document.title,
      timestamp: new Date().toISOString(),
      details,
      elementRect
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
    const rawText = target ? (target.innerText || target.value || '') : '';
    sendActivity(
      'click',
      {
        target: getElementSelector(target),
        tagName: target ? target.tagName : '',
        text: sanitizePII(rawText.substring(0, 100)),
        x: e.clientX,
        y: e.clientY
      },
      getElementBounds(target)
    );
  }, true);

  // Input event listener
  document.addEventListener('change', (e) => {
    const target = e.target;
    if (!target) return;
    const isPassword = target.type === 'password';
    const rawVal = target.value || '';
    sendActivity(
      'input_change',
      {
        target: getElementSelector(target),
        name: target.name || target.id || '',
        valueLength: rawVal.length,
        value: isPassword ? '[REDACTED_PASSWORD]' : sanitizePII(rawVal.substring(0, 100))
      },
      getElementBounds(target)
    );
  }, true);

  // Keydown listener
  document.addEventListener('keydown', (e) => {
    if (['Enter', 'Tab', 'Escape'].includes(e.key)) {
      sendActivity(
        'keydown',
        {
          key: e.key,
          target: getElementSelector(e.target)
        },
        getElementBounds(e.target)
      );
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

  // Feature 5: Page Visibility Listener
  document.addEventListener('visibilitychange', () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'VISIBILITY_CHANGE',
          isHidden: document.hidden
        });
      }
    } catch {
      // Ignored
    }
  });

  console.log('[Visual AI Agent] Content script v2 initialized with PII masking & bounding rects.');
})();
