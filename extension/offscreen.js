// offscreen.js - WebP Compression Engine & AI Bounding Box Renderer

(function () {
  const canvas = document.getElementById('offscreenCanvas');
  const ctx = canvas ? canvas.getContext('2d') : null;

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target !== 'offscreen') return false;

    if (message.type === 'PROCESS_FRAME') {
      handleFrameProcess(message.dataUrl, message.maxWidth || 1280, message.elementRect, message.actionLabel)
        .then((result) => sendResponse({ success: true, ...result }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true; // Keep channel open for async response
    }
  });

  async function handleFrameProcess(dataUrl, maxWidth, elementRect, actionLabel) {
    if (!dataUrl) {
      throw new Error('No dataUrl provided for frame processing');
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const scale = width > maxWidth ? maxWidth / width : 1.0;

        if (width > maxWidth) {
          height = Math.round(height * scale);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        if (ctx) {
          // Draw raw image
          ctx.drawImage(img, 0, 0, width, height);

          // Feature 2: Draw Target Bounding Box Overlay for Vision AI
          if (elementRect && elementRect.width > 0 && elementRect.height > 0) {
            const rx = Math.round(elementRect.x * scale);
            const ry = Math.round(elementRect.y * scale);
            const rw = Math.round(elementRect.width * scale);
            const rh = Math.round(elementRect.height * scale);

            ctx.save();
            // Translucent glowing fill
            ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
            ctx.fillRect(rx, ry, rw, rh);

            // High-contrast glowing border
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#00f0ff';
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 8;
            ctx.strokeRect(rx, ry, rw, rh);

            // Action tag badge
            const labelText = actionLabel || 'TARGET';
            ctx.font = 'bold 12px sans-serif';
            const textWidth = ctx.measureText(labelText).width;
            const badgeY = ry > 24 ? ry - 22 : ry + rh + 4;

            ctx.fillStyle = '#0f172a';
            ctx.fillRect(rx, badgeY, textWidth + 12, 20);
            ctx.fillStyle = '#00f0ff';
            ctx.fillText(labelText, rx + 6, badgeY + 14);

            ctx.restore();
          }

          // Feature 1: Export as optimized WebP image (0.75 quality)
          const base64Data = canvas.toDataURL('image/webp', 0.75);

          resolve({
            base64Image: base64Data,
            width,
            height,
            format: 'image/webp',
            timestamp: new Date().toISOString()
          });
        } else {
          resolve({
            base64Image: dataUrl,
            width: img.width,
            height: img.height,
            format: 'image/png',
            timestamp: new Date().toISOString()
          });
        }
      };

      img.onerror = (err) => reject(new Error('Failed to load frame image in offscreen document'));
      img.src = dataUrl;
    });
  }

  console.log('[Visual AI Agent] Offscreen WebP & Bounding Box renderer initialized.');
})();
