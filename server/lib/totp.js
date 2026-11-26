/**
 * Zero-dependency RFC 6238 TOTP (Google Authenticator / Authy compatible)
 * + AES-256-GCM secret-at-rest encryption + single-use recovery codes.
 */
import crypto from 'node:crypto';
import { config } from '../config.js';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;

export function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(str) {
  const clean = String(str || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** Generate a 160-bit Base32 TOTP secret (32 Base32 chars). */
export function generateTotpSecret() {
  return base32Encode(crypto.randomBytes(20));
}

/** Build an otpauth:// URI for authenticator apps. */
export function buildOtpAuthUri({ secret, accountName, issuer = 'LCCB Academix' }) {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Compute RFC 6238 6-digit TOTP code for a given Base32 secret and timestamp. */
export function generateTotpCode(secretBase32, timestampMs = Date.now()) {
  const key = base32Decode(secretBase32);
  const counter = Math.floor(timestampMs / 1000 / TOTP_STEP_SECONDS);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter), 0);

  const hmac = crypto.createHmac('sha1', key).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binCode % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

/** Verify a 6-digit TOTP code allowing ±windowSteps clock drift (constant-time). */
export function verifyTotpCode(secretBase32, code, { timestampMs = Date.now(), windowSteps = 1 } = {}) {
  const clean = String(code ?? '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(clean) || !secretBase32) return false;
  const provided = Buffer.from(clean, 'utf8');
  for (let delta = -windowSteps; delta <= windowSteps; delta += 1) {
    const candidate = Buffer.from(
      generateTotpCode(secretBase32, timestampMs + delta * TOTP_STEP_SECONDS * 1000),
      'utf8',
    );
    if (crypto.timingSafeEqual(provided, candidate)) return true;
  }
  return false;
}

function deriveEncryptionKey(secretKey = process.env.TOTP_ENCRYPTION_KEY || config.jwtSecret) {
  return crypto.createHash('sha256').update(`academix-totp-v1:${secretKey}`).digest();
}

export function encryptTotpSecret(plaintext, secretKey) {
  const key = deriveEncryptionKey(secretKey);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decryptTotpSecret(payload, secretKey) {
  if (!payload || typeof payload !== 'string') return null;
  const parts = payload.split('.');
  if (parts.length !== 3) return null;
  if (!parts.every((p) => /^[A-Za-z0-9+/]+={0,2}$/.test(p))) return null;
  try {
    const key = deriveEncryptionKey(secretKey);
    const iv = Buffer.from(parts[0], 'base64');
    const tag = Buffer.from(parts[1], 'base64');
    const encrypted = Buffer.from(parts[2], 'base64');
    if (iv.length !== 12 || tag.length !== 16) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

export function hashRecoveryCode(code) {
  const normalized = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return crypto.createHash('sha256').update(`academix-recovery:${normalized}`).digest('hex');
}

/** Generate 8 single-use recovery codes (format XXXX-XXXX) and their SHA-256 hashes. */
export function generateRecoveryCodes(count = 8) {
  const codes = [];
  const hashes = [];
  for (let i = 0; i < count; i += 1) {
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
    codes.push(formatted);
    hashes.push(hashRecoveryCode(formatted));
  }
  return { codes, hashes };
}

/** Check and consume a recovery code; returns { matched, remainingHashes }. */
export function consumeRecoveryCode(code, storedHashes = []) {
  if (!code || !Array.isArray(storedHashes) || storedHashes.length === 0) {
    return { matched: false, remainingHashes: storedHashes || [] };
  }
  const target = Buffer.from(hashRecoveryCode(code), 'hex');
  let matchIndex = -1;
  for (let i = 0; i < storedHashes.length; i += 1) {
    const candidateHex = String(storedHashes[i] || '');
    if (candidateHex.length !== 64) continue;
    const candidate = Buffer.from(candidateHex, 'hex');
    if (candidate.length === target.length && crypto.timingSafeEqual(candidate, target)) {
      matchIndex = i;
      break;
    }
  }
  if (matchIndex < 0) return { matched: false, remainingHashes: storedHashes };
  const remainingHashes = storedHashes.filter((_, idx) => idx !== matchIndex);
  return { matched: true, remainingHashes };
}
