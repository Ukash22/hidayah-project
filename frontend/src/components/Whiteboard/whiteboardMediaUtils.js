/**
 * Client-side image & file compression utilities for the Whiteboard.
 * Downscales images so that base64 data URLs stay well under the 1 MB WebSocket frame limit
 * (typically 80 KB - 180 KB), allowing smooth, instantaneous real-time sync across peers.
 */

export const compressImageDataUrl = (dataUrl, maxDimension = 1200, quality = 0.82) => {
    return new Promise((resolve) => {
        if (!dataUrl || typeof dataUrl !== 'string') {
            resolve({ dataURL: dataUrl, mimeType: 'image/png', width: 500, height: 380 });
            return;
        }

        // SVGs should not be rasterized if already vector, unless huge
        if (dataUrl.startsWith('data:image/svg+xml')) {
            resolve({ dataURL: dataUrl, mimeType: 'image/svg+xml', width: 500, height: 380 });
            return;
        }

        const img = new Image();
        img.onload = () => {
            let width = img.naturalWidth || img.width || 500;
            let height = img.naturalHeight || img.height || 380;

            if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                } else {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            try {
                const compressed = canvas.toDataURL('image/jpeg', quality);
                resolve({
                    dataURL: compressed,
                    mimeType: 'image/jpeg',
                    width,
                    height
                });
            } catch (_err) {
                resolve({
                    dataURL: dataUrl,
                    mimeType: 'image/jpeg',
                    width,
                    height
                });
            }
        };

        img.onerror = () => {
            resolve({
                dataURL: dataUrl,
                mimeType: 'image/png',
                width: 500,
                height: 380
            });
        };

        img.src = dataUrl;
    });
};

export const compressImageFile = (file, maxDimension = 1200, quality = 0.82) => {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('No file provided'));
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const rawDataUrl = e.target.result;
                const result = await compressImageDataUrl(rawDataUrl, maxDimension, quality);
                resolve(result);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });
};
