// offscreen.js - Frame Capture & Base64 Converter for Visual AI Agent

(function () {
  const canvas = document.getElementById('offscreenCanvas');
  const ctx = canvas ? canvas.getContext('2d') : null;

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target !== 'offscreen') return false;

    if (message.type === 'PROCESS_FRAME') {
      handleFrameProcess(message.dataUrl, message.maxWidth || 1280)
        .then((result) => sendResponse({ success: true, ...result }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true; // Keep channel open for async response
    }
  });

  async function handleFrameProcess(dataUrl, maxWidth) {
    if (!dataUrl) {
      throw new Error('No dataUrl provided for frame processing');
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Scale down if larger than maxWidth while retaining aspect ratio
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const base64Data = canvas.toDataURL('image/png');
          
          resolve({
            base64Image: base64Data,
            width,
            height,
            timestamp: new Date().toISOString()
          });
        } else {
          // Fallback if canvas context is unavailable
          resolve({
            base64Image: dataUrl,
            width: img.width,
            height: img.height,
            timestamp: new Date().toISOString()
          });
        }
      };

      img.onerror = (err) => reject(new Error('Failed to load frame image in offscreen document'));
      img.src = dataUrl;
    });
  }

  console.log('[Visual AI Agent] Offscreen document script initialized.');
})();
