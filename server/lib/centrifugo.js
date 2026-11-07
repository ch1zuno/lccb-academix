import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export const MIN_CENTRIFUGO_SECRET_LENGTH = 32;

/**
 * Sign a connection JWT for Centrifugo v6 client authentication.
 *
 * @param {Object} options
 * @param {string|number} options.userId - Unique authenticated user identifier.
 * @param {Object} [options.info={}] - Non-sensitive client profile data.
 * @param {number} [options.ttlSeconds=600] - Token lifetime in seconds (default 10m).
 * @param {string} [options.secretOverride] - For testing explicit secret injection.
 * @returns {string} Signed HS256 JWT string.
 */
export function signConnectionToken({ userId, info = {}, ttlSeconds = 600, secretOverride } = {}) {
  const secret = secretOverride !== undefined ? secretOverride : config.centrifugoSecret;

  if (!secret || typeof secret !== 'string' || secret.length < MIN_CENTRIFUGO_SECRET_LENGTH) {
    throw new Error(
      `CENTRIFUGO_SECRET must be configured and at least ${MIN_CENTRIFUGO_SECRET_LENGTH} characters long`,
    );
  }

  if (!userId) {
    throw new Error('userId is required to sign a Centrifugo connection token');
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: String(userId),
    info: typeof info === 'object' && info !== null ? info : {},
    iat: now,
    exp: now + ttlSeconds,
  };

  // Explicitly pinned to HS256; secret encoded as byte buffer
  const secretBytes = Buffer.from(secret, 'utf-8');

  return jwt.sign(payload, secretBytes, {
    algorithm: 'HS256',
  });
}
