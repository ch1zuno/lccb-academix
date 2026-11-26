/**
 * Swappable image storage abstraction for Classroom task & submission images.
 *
 * Defaults to local disk (`uploads/task-attachments/`) so local development and
 * tests work with zero cloud dependencies. Automatically uses Cloudflare R2 when
 * `TASK_STORAGE_DRIVER=r2` (or on Vercel when R2 credentials are present).
 * Swapping to Supabase Storage later only requires adding one driver branch here.
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isR2Configured, uploadToR2, getFromR2, deleteFromR2 } from './storage.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultLocalRoot = path.resolve(here, '..', '..', 'uploads', 'task-attachments');

export function resolveTaskStorageDriver() {
  const explicit = String(process.env.TASK_STORAGE_DRIVER || '').trim().toLowerCase();
  if (explicit === 'local' || explicit === 'r2') return explicit;
  if ((process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') && isR2Configured()) return 'r2';
  return 'local';
}

function localBaseDir() {
  return path.resolve(process.env.TASK_STORAGE_DIR || defaultLocalRoot);
}

function safeLocalPath(baseDir, key) {
  const cleanKey = String(key || '').replace(/^\/+/, '');
  const resolved = path.resolve(baseDir, cleanKey);
  if (!resolved.startsWith(baseDir + path.sep)) {
    throw new Error('Invalid storage key');
  }
  return resolved;
}

async function ensureWritableDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
    return dir;
  } catch {
    // Fallback for read-only hosts when R2 is not configured.
    const fallback = path.join(os.tmpdir(), 'academix-task-attachments');
    await fs.mkdir(fallback, { recursive: true });
    return fallback;
  }
}

export async function saveTaskImage({ key, buffer, mimeType }) {
  const driver = resolveTaskStorageDriver();
  if (driver === 'r2') {
    await uploadToR2({ key: `tasks/${key}`, buffer, mimeType });
    return { driver: 'r2', key: `tasks/${key}` };
  }
  const baseDir = await ensureWritableDir(localBaseDir());
  const fullPath = safeLocalPath(baseDir, key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
  return { driver: 'local', key };
}

export async function readTaskImage({ driver, key }) {
  if (driver === 'r2') {
    const obj = await getFromR2(key);
    return { stream: obj.stream, buffer: null };
  }
  const primary = safeLocalPath(localBaseDir(), key);
  try {
    return { buffer: await fs.readFile(primary), stream: null };
  } catch (err) {
    const fallback = safeLocalPath(path.join(os.tmpdir(), 'academix-task-attachments'), key);
    return { buffer: await fs.readFile(fallback), stream: null };
  }
}

export async function deleteTaskImage({ driver, key }) {
  if (!key) return;
  if (driver === 'r2') {
    await deleteFromR2(key).catch(() => {});
    return;
  }
  const primary = safeLocalPath(localBaseDir(), key);
  await fs.unlink(primary).catch(() => {});
  const fallback = safeLocalPath(path.join(os.tmpdir(), 'academix-task-attachments'), key);
  await fs.unlink(fallback).catch(() => {});
}
