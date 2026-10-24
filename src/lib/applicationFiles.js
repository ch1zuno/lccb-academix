/* Shared rules and helpers for tutor-application file attachments. */
import api from '../api';

export const MAX_APPLICATION_FILES = 5;
export const MAX_APPLICATION_FILE_BYTES = 4 * 1024 * 1024;
export const APPLICATION_FILE_ACCEPT = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp';

const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'webp']);

export function fileExtension(name = '') {
  const match = /\.([a-z0-9]+)$/i.exec(String(name).trim());
  return match ? match[1].toLowerCase() : '';
}

export function formatFileSize(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export const isImageFile = (mime = '') => /^image\//i.test(String(mime));
export const canPreviewFile = (mime = '') => /^(image\/|application\/pdf)/i.test(String(mime));

/**
 * Validates picked files against the server rules.
 * @returns {{ accepted: File[], errors: string[] }}
 */
export function validateApplicationFiles(fileList, room) {
  const accepted = [];
  const errors = [];
  const incoming = Array.from(fileList ?? []);
  for (const file of incoming) {
    const ext = fileExtension(file.name);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      errors.push(`${file.name} is not a PDF, DOC, DOCX, PNG, JPG or WEBP file.`);
      continue;
    }
    if (file.size > MAX_APPLICATION_FILE_BYTES) {
      errors.push(`${file.name} is larger than 4 MB.`);
      continue;
    }
    if (accepted.length >= room) {
      errors.push(`Up to ${MAX_APPLICATION_FILES} files per application.`);
      continue;
    }
    accepted.push(file);
  }
  return { accepted, errors };
}

/** Opens a previewable document in a new tab (fetched with the auth header). */
export async function openApplicationDocument(doc) {
  const tab = window.open('', '_blank');
  try {
    const blob = await api.blob(`/accreditation/documents/${doc.id}`);
    const url = URL.createObjectURL(blob);
    if (!tab) throw new Error('Allow pop-ups for this site to open the file.');
    tab.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    tab?.close();
    throw e;
  }
}

/** Downloads a document with its original file name. */
export async function downloadApplicationDocument(doc) {
  const blob = await api.blob(`/accreditation/documents/${doc.id}?download=1`);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = doc.file_name || 'supporting-document';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
