/**
 * Rules for tutor-application attachments.
 *
 * Files are stored in Postgres (bytea) because the API runs as a Vercel
 * serverless function with a read-only filesystem and no object storage.
 * Vercel caps request bodies at 4.5 MB, so the client uploads one file per
 * request and each file is capped at 4 MB; an application may hold 5 files.
 */
import multer from 'multer';
import { httpError } from '../middleware/errors.js';

export const MAX_APPLICATION_FILES = 5;
export const MAX_APPLICATION_FILE_BYTES = 4 * 1024 * 1024;
export const APPLICATION_FILE_ACCEPT = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp';

export const EXTENSION_MIME = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export function fileExtension(name = '') {
  const match = /\.([a-z0-9]+)$/i.exec(String(name).trim());
  return match ? match[1].toLowerCase() : '';
}

/** Magic-byte check so a renamed executable cannot pass as a document. */
function contentMatchesExtension(ext, buffer) {
  const bytes = buffer ?? Buffer.alloc(0);
  const ascii = (start, text) => bytes.subarray(start, start + text.length).toString('latin1') === text;
  switch (ext) {
    case 'pdf':
      return ascii(0, '%PDF-');
    case 'png':
      return bytes.length > 8 && bytes[0] === 0x89 && ascii(1, 'PNG');
    case 'jpg':
    case 'jpeg':
      return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case 'webp':
      return bytes.length > 12 && ascii(0, 'RIFF') && ascii(8, 'WEBP');
    case 'docx':
      // Office Open XML is a zip container.
      return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
    case 'doc':
      // Legacy Word is an OLE compound file.
      return bytes.length > 8
        && bytes.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
    default:
      return false;
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_APPLICATION_FILE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = fileExtension(file.originalname);
    if (!EXTENSION_MIME[ext]) {
      return cb(httpError(400, `Unsupported file type .${ext || '?'} — use PDF, DOC, DOCX, PNG, JPG or WEBP.`));
    }
    const declared = String(file.mimetype || '').toLowerCase();
    const acceptable = declared === EXTENSION_MIME[ext]
      || (ext === 'jpeg' && declared === EXTENSION_MIME.jpg)
      || declared === 'application/octet-stream'
      || declared === '';
    if (!acceptable) {
      return cb(httpError(400, `That file does not look like a ${ext.toUpperCase()} file.`));
    }
    return cb(null, true);
  },
});

/** Accepts one multipart file in the "document" field; translates size errors. */
export function uploadApplicationDocument(req, res, next) {
  upload.single('document')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(httpError(400, 'Each file must be 4 MB or smaller.'));
      }
      return next(httpError(400, err.message));
    }
    return next(err);
  });
}

/** Returns normalized metadata for a validated upload (throws on bad content). */
export function validateApplicationFile(file) {
  if (!file?.buffer?.length) throw httpError(400, 'Attach a file in the "document" field.');
  const ext = fileExtension(file.originalname);
  if (!contentMatchesExtension(ext, file.buffer)) {
    throw httpError(400, `The file content does not match a ${ext.toUpperCase()} file.`);
  }
  const cleaned = String(file.originalname)
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 180);
  return {
    fileName: cleaned || `document.${ext}`,
    mimeType: EXTENSION_MIME[ext],
    sizeBytes: file.buffer.length,
    data: file.buffer,
  };
}
