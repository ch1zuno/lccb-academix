/**
 * Cloudflare R2 object storage client (S3-compatible API).
 *
 * Provides upload, retrieval, and deletion helpers with fallback detection.
 * When R2 credentials are missing, callers gracefully fallback to PostgreSQL bytea.
 */
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

let s3ClientInstance = null;

export function isR2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

export function getR2Client() {
  if (!isR2Configured()) {
    throw new Error('Cloudflare R2 is not configured in environment variables.');
  }
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3ClientInstance;
}

/**
 * Uploads a buffer to Cloudflare R2.
 * @param {object} params
 * @param {string} params.key - R2 object key (e.g. avatars/user-123.jpg)
 * @param {Buffer} params.buffer - File binary content
 * @param {string} params.mimeType - Content type header
 * @returns {Promise<{ key: string, url: string | null }>}
 */
export async function uploadToR2({ key, buffer, mimeType }) {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  });

  await client.send(command);

  const publicBase = (process.env.R2_PUBLIC_URL || '').trim().replace(/\/+$/, '');
  const url = publicBase ? `${publicBase}/${key}` : null;

  return { key, url };
}

/**
 * Deletes an object from Cloudflare R2.
 * @param {string} key - R2 object key
 */
export async function deleteFromR2(key) {
  if (!key || !isR2Configured()) return;
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await client.send(command);
}

/**
 * Retrieves an object stream from Cloudflare R2.
 * @param {string} key - R2 object key
 * @returns {Promise<{ stream: any, contentType: string, contentLength: number, etag: string }>}
 */
export async function getFromR2(key) {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await client.send(command);

  return {
    stream: response.Body,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    etag: response.ETag,
  };
}

/** Resets client instance (primarily for tests) */
export function _resetClientForTesting() {
  s3ClientInstance = null;
}
