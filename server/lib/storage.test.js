import test from 'node:test';
import assert from 'node:assert/strict';
import { isR2Configured, getR2Client, _resetClientForTesting } from './storage.js';

test('isR2Configured returns false when env variables are missing', () => {
  const orig = { ...process.env };
  try {
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET_NAME;
    _resetClientForTesting();

    assert.equal(isR2Configured(), false);
    assert.throws(() => getR2Client(), /not configured/);
  } finally {
    process.env = orig;
    _resetClientForTesting();
  }
});

test('isR2Configured returns true when all 4 core env variables are present', () => {
  const orig = { ...process.env };
  try {
    process.env.R2_ACCOUNT_ID = 'test-account-id';
    process.env.R2_ACCESS_KEY_ID = 'test-access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret-key';
    process.env.R2_BUCKET_NAME = 'test-bucket';
    _resetClientForTesting();

    assert.equal(isR2Configured(), true);
    const client = getR2Client();
    assert.ok(client);
  } finally {
    process.env = orig;
    _resetClientForTesting();
  }
});
