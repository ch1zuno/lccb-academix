import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import {
  validateGoogleFormUrl,
  validateTaskImage,
  MAX_TASK_IMAGE_BYTES,
} from './task-validation.js';
import {
  saveTaskImage,
  readTaskImage,
  deleteTaskImage,
} from './task-storage.js';

const TINY_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000080000000808020000004b6d29dc0000002449444154789c63e0d774bab286178290d90c5845f9359d18b08a427560358d810e760000330852116232cd090000000049454e44ae426082',
  'hex',
);

test('validateGoogleFormUrl accepts valid https forms.gle and docs.google.com/forms links', () => {
  assert.equal(validateGoogleFormUrl(''), null);
  assert.equal(validateGoogleFormUrl(null), null);
  assert.equal(
    validateGoogleFormUrl('https://forms.gle/AbCdEf12345'),
    'https://forms.gle/AbCdEf12345',
  );
  assert.equal(
    validateGoogleFormUrl('https://docs.google.com/forms/d/e/1FAIpQLSfDemo/viewform'),
    'https://docs.google.com/forms/d/e/1FAIpQLSfDemo/viewform',
  );
});

test('validateGoogleFormUrl rejects http, non-form docs, and spoofed hosts', () => {
  const bad = [
    'http://forms.gle/AbCdEf',
    'https://forms.gle/',
    'https://docs.google.com/document/d/123',
    'https://forms.gle.evil.com/abc',
    'javascript:alert(1)',
    'not-a-url',
  ];
  for (const url of bad) {
    assert.throws(() => validateGoogleFormUrl(url), (err) => err.status === 400, `Expected 400 for ${url}`);
  }
});

test('validateTaskImage verifies magic bytes, extension, and size cap', () => {
  const ok = validateTaskImage({ originalname: 'diagram.png', buffer: TINY_PNG });
  assert.equal(ok.mimeType, 'image/png');
  assert.equal(ok.ext, 'png');
  assert.equal(ok.sizeBytes, TINY_PNG.length);

  assert.throws(
    () => validateTaskImage({ originalname: 'fake.png', buffer: Buffer.from('not a png') }),
    (err) => err.status === 400,
  );
  assert.throws(
    () => validateTaskImage({ originalname: 'script.svg', buffer: Buffer.from('<svg></svg>') }),
    (err) => err.status === 400,
  );
  assert.throws(
    () => validateTaskImage({ originalname: 'big.png', buffer: Buffer.alloc(MAX_TASK_IMAGE_BYTES + 1) }),
    (err) => err.status === 400,
  );
});

test('task-storage local driver saves, reads, and deletes image buffers cleanly', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'academix-task-storage-test-'));
  const prevDriver = process.env.TASK_STORAGE_DRIVER;
  const prevDir = process.env.TASK_STORAGE_DIR;
  process.env.TASK_STORAGE_DRIVER = 'local';
  process.env.TASK_STORAGE_DIR = tmpDir;
  try {
    const saved = await saveTaskImage({ key: 't1/prompt/test.png', buffer: TINY_PNG, mimeType: 'image/png' });
    assert.equal(saved.driver, 'local');
    const read = await readTaskImage(saved);
    assert.deepEqual(read.buffer, TINY_PNG);
    await deleteTaskImage(saved);
    await assert.rejects(() => readTaskImage(saved));
  } finally {
    if (prevDriver === undefined) delete process.env.TASK_STORAGE_DRIVER;
    else process.env.TASK_STORAGE_DRIVER = prevDriver;
    if (prevDir === undefined) delete process.env.TASK_STORAGE_DIR;
    else process.env.TASK_STORAGE_DIR = prevDir;
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
