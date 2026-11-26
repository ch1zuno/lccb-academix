/** Validation rules and upload middleware for Classroom-style task images and Google Form links. */
import path from 'node:path';
import multer from 'multer';
import { httpError } from '../middleware/errors.js';

export const MAX_TASK_IMAGES = 4;
export const MAX_TASK_IMAGE_BYTES = 4 * 1024 * 1024;
export const TASK_IMAGE_ACCEPT = '.png,.jpg,.jpeg,.webp';

export const IMAGE_EXTENSION_MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export function imageExtension(name = '') {
  const match = /\.([a-z0-9]+)$/i.exec(String(name).trim());
  return match ? match[1].toLowerCase() : '';
}

export function sanitizeImageName(name = '') {
  const baseName = path.basename(String(name).replace(/\\/g, '/'));
  const cleaned = baseName
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/["\\/]+/g, '_')
    .replace(/^\.+/, '')
    .trim();
  return (cleaned || 'image.png').slice(0, 140);
}

/** Validates an optional HTTPS Google Forms link (forms.gle or docs.google.com/forms). */
export function validateGoogleFormUrl(raw) {
  if (raw == null || String(raw).trim() === '') return null;
  const text = String(raw).trim();
  if (text.length > 500) {
    throw httpError(400, 'Google Forms link must be 500 characters or fewer.');
  }
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    throw httpError(400, 'Google Forms link must be a valid https://forms.gle or https://docs.google.com/forms URL.');
  }
  if (parsed.protocol !== 'https:') {
    throw httpError(400, 'Google Forms link must use https://.');
  }
  const host = parsed.hostname.toLowerCase();
  const isFormsGle = host === 'forms.gle' && parsed.pathname.length > 1;
  const isDocsForms = host === 'docs.google.com' && (parsed.pathname === '/forms' || parsed.pathname.startsWith('/forms/'));
  if (!isFormsGle && !isDocsForms) {
    throw httpError(400, 'Google Forms link must point to forms.gle or docs.google.com/forms.');
  }
  return parsed.toString();
}

/** Magic-byte verification so renamed non-images cannot upload as task attachments. */
export function imageMatchesMagicBytes(ext, buffer) {
  const bytes = buffer ?? Buffer.alloc(0);
  const ascii = (start, text) => bytes.subarray(start, start + text.length).toString('latin1') === text;
  switch (ext) {
    case 'png':
      return bytes.length > 8 && bytes[0] === 0x89 && ascii(1, 'PNG');
    case 'jpg':
    case 'jpeg':
      return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case 'webp':
      return bytes.length > 12 && ascii(0, 'RIFF') && ascii(8, 'WEBP');
    default:
      return false;
  }
}

export function validateTaskImage(file) {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw httpError(400, 'Choose an image file to upload.');
  }
  if (file.buffer.length === 0) {
    throw httpError(400, 'Image file is empty.');
  }
  if (file.buffer.length > MAX_TASK_IMAGE_BYTES) {
    throw httpError(400, 'Each image must be 4 MB or smaller.');
  }
  const ext = imageExtension(file.originalname);
  const mimeType = IMAGE_EXTENSION_MIME[ext];
  if (!mimeType) {
    throw httpError(400, `Unsupported image type .${ext || '?'} — use PNG, JPG, or WEBP.`);
  }
  if (!imageMatchesMagicBytes(ext, file.buffer)) {
    throw httpError(400, `File contents do not match a valid ${ext.toUpperCase()} image.`);
  }
  return {
    fileName: sanitizeImageName(file.originalname),
    mimeType,
    sizeBytes: file.buffer.length,
    ext,
  };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_TASK_IMAGE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = imageExtension(file.originalname);
    if (!IMAGE_EXTENSION_MIME[ext]) {
      return cb(httpError(400, `Unsupported image type .${ext || '?'} — use PNG, JPG, or WEBP.`));
    }
    return cb(null, true);
  },
});

export function uploadTaskImage(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(httpError(400, 'Each image must be 4 MB or smaller.'));
    }
    return next(err.status ? err : httpError(400, err.message || 'Image upload failed.'));
  });
}
