import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import {
  base32Encode,
  base32Decode,
  generateTotpSecret,
  buildOtpAuthUri,
  generateTotpCode,
  verifyTotpCode,
  encryptTotpSecret,
  decryptTotpSecret,
  generateRecoveryCodes,
  consumeRecoveryCode,
} from './totp.js';
import { signToken } from '../middleware/auth.js';
import { ROLE_SESSION_TTL_SECONDS, sessionTtlSecondsForRole } from './sessionCookie.js';

test('Base32 encode/decode round-trips cleanly', () => {
  const raw = Buffer.from('12345678901234567890', 'ascii');
  const encoded = base32Encode(raw);
  assert.equal(encoded, 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
  assert.deepEqual(base32Decode(encoded), raw);
});

test('RFC 6238 SHA-1 TOTP test vector matches standard', () => {
  // RFC 6238 Appendix B test vector: secret "12345678901234567890", T=59s -> 287082 (6 digits)
  const secret = base32Encode(Buffer.from('12345678901234567890', 'ascii'));
  assert.equal(generateTotpCode(secret, 59 * 1000), '287082');
  assert.equal(verifyTotpCode(secret, '287082', { timestampMs: 59 * 1000 }), true);
  assert.equal(verifyTotpCode(secret, '287082', { timestampMs: 89 * 1000, windowSteps: 1 }), true);
  assert.equal(verifyTotpCode(secret, '287082', { timestampMs: 150 * 1000, windowSteps: 1 }), false);
  assert.equal(verifyTotpCode(secret, '000000', { timestampMs: 59 * 1000 }), false);
});

test('TOTP secret encryption/decryption round-trips and detects tampering', () => {
  const secret = generateTotpSecret();
  assert.equal(secret.length, 32);
  const uri = buildOtpAuthUri({ secret, accountName: 'dean@lccbacolod.edu.ph' });
  assert.match(uri, /^otpauth:\/\/totp\//);

  const enc = encryptTotpSecret(secret, 'unit-test-encryption-key');
  assert.notEqual(enc, secret);
  assert.equal(decryptTotpSecret(enc, 'unit-test-encryption-key'), secret);
  assert.equal(decryptTotpSecret(enc, 'wrong-key'), null);
  const [iv, tag, body] = enc.split('.');
  const flippedBody = `${body[0] === 'A' ? 'B' : 'A'}${body.slice(1)}`;
  assert.equal(decryptTotpSecret(`${iv}.${tag}.${flippedBody}`, 'unit-test-encryption-key'), null);
  assert.equal(decryptTotpSecret(`${enc}tamper`, 'unit-test-encryption-key'), null);
});

test('Recovery codes are single-use and format-tolerant', () => {
  const { codes, hashes } = generateRecoveryCodes(8);
  assert.equal(codes.length, 8);
  assert.equal(hashes.length, 8);
  assert.match(codes[0], /^[0-9A-F]{4}-[0-9A-F]{4}$/);

  const firstUse = consumeRecoveryCode(codes[0].toLowerCase().replace('-', ''), hashes);
  assert.equal(firstUse.matched, true);
  assert.equal(firstUse.remainingHashes.length, 7);

  // Replay of already-used code fails
  const secondUse = consumeRecoveryCode(codes[0], firstUse.remainingHashes);
  assert.equal(secondUse.matched, false);
});

test('Role-scoped JWT TTLs enforce tighter lifetimes for superadmin (2h) and tutor (12h)', () => {
  assert.equal(sessionTtlSecondsForRole('superadmin'), 2 * 60 * 60);
  assert.equal(sessionTtlSecondsForRole('tutor'), 12 * 60 * 60);
  assert.equal(sessionTtlSecondsForRole('faculty'), 24 * 60 * 60);
  assert.equal(sessionTtlSecondsForRole('learner'), 48 * 60 * 60);

  for (const [role, expectedTtl] of Object.entries(ROLE_SESSION_TTL_SECONDS)) {
    const token = signToken({ id: `u-${role}`, role, name: role, token_version: 1 });
    const decoded = jwt.decode(token);
    assert.equal(decoded.exp - decoded.iat, expectedTtl);
  }
});
