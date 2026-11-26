import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProductionSecrets } from '../config.js';
import { SEED_DEMO_HASH, isDemoPasswordBlocked } from '../routes/auth.js';
import { generateCheckInToken, normalizeCheckInToken, isValidDeviceKey } from '../routes/sessions.js';
import { formatErrorMessage } from '../middleware/errors.js';
import { validateApplicationFile } from './application-files.js';
import { sanitizeImageName } from './task-validation.js';
import { resolveTaskStorageDriver } from './task-storage.js';

const pdf = Buffer.from('%PDF-1.7\n1 0 obj\n', 'latin1');

test('F1: validateProductionSecrets rejects missing or default secrets in production', () => {
  assert.throws(
    () => validateProductionSecrets({ isProd: true, jwtSecret: 'dev-secret-change-me', deviceApiKey: '', jitsiRoomSecret: 'strong-jitsi-secret-123456' }),
    /JWT_SECRET/i,
  );
  assert.throws(
    () => validateProductionSecrets({ isProd: true, jwtSecret: 'short', deviceApiKey: '', jitsiRoomSecret: 'strong-jitsi-secret-123456' }),
    /JWT_SECRET/i,
  );
  assert.throws(
    () => validateProductionSecrets({ isProd: true, jwtSecret: 'super-strong-prod-jwt-secret-32chars', deviceApiKey: 'dev-device-key', jitsiRoomSecret: 'strong-jitsi-secret-123456' }),
    /DEVICE_API_KEY/i,
  );
  assert.throws(
    () => validateProductionSecrets({ isProd: true, jwtSecret: 'super-strong-prod-jwt-secret-32chars', deviceApiKey: 'too-short', jitsiRoomSecret: 'strong-jitsi-secret-123456' }),
    /DEVICE_API_KEY/i,
  );
  assert.throws(
    () => validateProductionSecrets({ isProd: true, jwtSecret: 'super-strong-prod-jwt-secret-32chars', deviceApiKey: '', jitsiRoomSecret: 'dev-jitsi-room-secret-change-me' }),
    /JITSI_ROOM_SECRET/i,
  );
  assert.throws(
    () => validateProductionSecrets({ isProd: true, jwtSecret: 'super-strong-prod-jwt-secret-32chars', deviceApiKey: '', jitsiRoomSecret: 'short' }),
    /JITSI_ROOM_SECRET/i,
  );

  // Strong production config passes (including optional empty deviceApiKey, which fails closed at runtime)
  assert.doesNotThrow(() => validateProductionSecrets({
    isProd: true,
    jwtSecret: 'super-strong-prod-jwt-secret-32chars',
    deviceApiKey: '',
    jitsiRoomSecret: 'super-strong-prod-jwt-secret-32chars',
  }));

  // Non-production allows dev defaults
  assert.doesNotThrow(() => validateProductionSecrets({
    isProd: false,
    jwtSecret: 'dev-secret-change-me',
    deviceApiKey: 'dev-device-key',
    jitsiRoomSecret: 'dev-jitsi-room-secret-change-me',
  }));
});

test('F2: isDemoPasswordBlocked blocks seeded demo hash in prod unless DEMO_MODE is on', () => {
  assert.equal(isDemoPasswordBlocked(SEED_DEMO_HASH, { isProd: true, demoMode: false }), true);
  assert.equal(isDemoPasswordBlocked(SEED_DEMO_HASH, { isProd: true, demoMode: true }), false);
  assert.equal(isDemoPasswordBlocked(SEED_DEMO_HASH, { isProd: false, demoMode: false }), false);
  assert.equal(isDemoPasswordBlocked('$2b$12$someOtherRotatedPasswordHashValueHere1234567890', { isProd: true, demoMode: false }), false);
});

test('F3: generateCheckInToken uses CSPRNG format with high uniqueness', () => {
  const seen = new Set();
  for (let i = 0; i < 500; i += 1) {
    const otp = generateCheckInToken('otp');
    assert.match(otp, /^\d{6}-\d{6}$/);
    seen.add(otp);
  }
  assert.equal(seen.size, 500);

  const fp = generateCheckInToken('fingerprint');
  assert.match(fp, /^fp-[0-9a-f]{12}$/);

  assert.equal(normalizeCheckInToken('123456-789012'), '123456-789012');
  assert.equal(normalizeCheckInToken(' 123456 789012 '), '123456-789012');
  assert.equal(normalizeCheckInToken('123456789012'), '123456-789012');
  assert.equal(normalizeCheckInToken('fp-abcdef012345'), 'fp-abcdef012345');
});

test('F7: formatErrorMessage hides 500 SQL/internal details in production only', () => {
  const sqlErr = new Error('relation "users" does not exist');
  assert.equal(formatErrorMessage(sqlErr, 500, true), 'Internal server error');
  assert.equal(formatErrorMessage(sqlErr, 500, false), 'relation "users" does not exist');

  const clientErr = new Error('Task title is required');
  assert.equal(formatErrorMessage(clientErr, 400, true), 'Task title is required');
});

test('F9: isValidDeviceKey verifies keys in constant time and rejects empty keys', () => {
  assert.equal(isValidDeviceKey('my-secret-device-key', 'my-secret-device-key'), true);
  assert.equal(isValidDeviceKey('my-secret-device-keY', 'my-secret-device-key'), false);
  assert.equal(isValidDeviceKey('short', 'my-secret-device-key'), false);
  assert.equal(isValidDeviceKey('', ''), false);
  assert.equal(isValidDeviceKey('dev-device-key', ''), false);
});

test('F10: validateApplicationFile neutralizes traversal paths, slashes, and quotes', () => {
  const unixTraversal = validateApplicationFile({
    originalname: '../../../etc/passwd.pdf',
    mimetype: 'application/pdf',
    buffer: pdf,
  });
  assert.equal(unixTraversal.fileName, 'passwd.pdf');

  const winTraversal = validateApplicationFile({
    originalname: '..\\..\\bad"name.pdf',
    mimetype: 'application/pdf',
    buffer: pdf,
  });
  assert.equal(winTraversal.fileName, 'bad_name.pdf');

  assert.equal(sanitizeImageName('../../../etc/photo"1.png'), 'photo_1.png');
  assert.equal(sanitizeImageName('..\\..\\..hidden.webp'), 'hidden.webp');
});

test('Render/production auto-selects R2 task storage when R2 credentials exist', () => {
  const saved = {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    TASK_STORAGE_DRIVER: process.env.TASK_STORAGE_DRIVER,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
  };
  try {
    delete process.env.TASK_STORAGE_DRIVER;
    delete process.env.VERCEL;
    process.env.NODE_ENV = 'production';
    process.env.R2_ACCOUNT_ID = 'acct';
    process.env.R2_ACCESS_KEY_ID = 'key';
    process.env.R2_SECRET_ACCESS_KEY = 'secret';
    process.env.R2_BUCKET_NAME = 'bucket';
    assert.equal(resolveTaskStorageDriver(), 'r2');
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});
