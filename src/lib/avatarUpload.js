/**
 * Client-side avatar validation, crop, and resize utility.
 * Validates by inspecting binary magic bytes (not extension).
 * Center-crops and resizes to 256x256 via Canvas.
 */

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
export const TARGET_AVATAR_SIZE = 256; // 256x256 px

/**
 * Checks magic bytes of a file to verify JPEG, PNG, or WebP.
 * @param {File|Blob} file
 * @returns {Promise<{valid: boolean, mimeType?: string, error?: string}>}
 */
export async function validateAvatarFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return {
      valid: false,
      error: `File size is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Maximum allowed size is 2 MB.`,
    };
  }

  try {
    const headerBuffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(headerBuffer);

    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return { valid: true, mimeType: 'image/jpeg' };
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    ) {
      return { valid: true, mimeType: 'image/png' };
    }

    // WebP: RIFF (bytes 0-3: 52 49 46 46) ... WEBP (bytes 8-11: 57 45 42 50)
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return { valid: true, mimeType: 'image/webp' };
    }

    return {
      valid: false,
      error: 'Invalid file format. Please upload a JPEG, PNG, or WebP image.',
    };
  } catch (err) {
    return { valid: false, error: `Could not read file: ${err.message}` };
  }
}

/**
 * Center-crops and scales an image to a square canvas of targetSize x targetSize.
 * @param {File|Blob} file
 * @param {number} [targetSize=256]
 * @returns {Promise<{dataUrl: string, mimeType: string, blob: Blob}>}
 */
export async function cropAndResizeToCanvas(file, targetSize = TARGET_AVATAR_SIZE) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context not available'));
          return;
        }

        // Center crop calculation
        const nw = img.naturalWidth || img.width;
        const nh = img.naturalHeight || img.height;
        const minDim = Math.min(nw, nh);
        const sx = (nw - minDim) / 2;
        const sy = (nh - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

        // Export as WebP or JPEG fallback
        let mimeType = 'image/webp';
        let dataUrl = canvas.toDataURL('image/webp', 0.85);

        // If browser doesn't support WebP export, it returns image/png
        if (!dataUrl.startsWith('data:image/webp')) {
          mimeType = 'image/jpeg';
          dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create avatar image blob'));
              return;
            }
            resolve({ dataUrl, mimeType, blob });
          },
          mimeType,
          0.85
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for cropping.'));
    };

    img.src = objectUrl;
  });
}
