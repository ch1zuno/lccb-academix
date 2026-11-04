import test from 'node:test';
import assert from 'node:assert/strict';
import { fileExtension, validateApplicationFile } from './application-files.js';

const file = (name, mimetype, buffer) => ({ originalname: name, mimetype, buffer });
const pdf = Buffer.from('%PDF-1.7\n1 0 obj\n', 'latin1');
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('body')]);
const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const docx = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
const doc = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00]);

test('fileExtension lowercases and handles dotted names', () => {
  assert.equal(fileExtension('Transcript.PDF'), 'pdf');
  assert.equal(fileExtension('scan.final.JPEG'), 'jpeg');
  assert.equal(fileExtension('no-extension'), '');
  assert.equal(fileExtension(''), '');
});

test('valid magic bytes are normalized to the canonical mime type', () => {
  assert.equal(validateApplicationFile(file('Transcript.PDF', 'application/pdf', pdf)).mimeType, 'application/pdf');
  assert.equal(validateApplicationFile(file('id.png', 'image/png', png)).mimeType, 'image/png');
  assert.equal(validateApplicationFile(file('photo.jpeg', 'image/jpeg', jpg)).mimeType, 'image/jpeg');
  assert.equal(
    validateApplicationFile(file('form.docx', 'application/octet-stream', docx)).mimeType,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  );
  assert.equal(validateApplicationFile(file('old.doc', 'application/msword', doc)).mimeType, 'application/msword');
});

test('renamed or fake content is rejected', () => {
  assert.throws(
    () => validateApplicationFile(file('fake.pdf', 'application/pdf', Buffer.from('MZ executable'))),
    (error) => error.status === 400 && /content does not match/i.test(error.message),
  );
  assert.throws(
    () => validateApplicationFile(file('empty.png', 'image/png', Buffer.alloc(0))),
    (error) => error.status === 400,
  );
});

test('control characters are stripped from stored names', () => {
  const result = validateApplicationFile(file('  report\u0000\u001f.pdf  ', 'application/pdf', pdf));
  assert.equal(result.fileName, 'report.pdf');
  assert.equal(result.sizeBytes, pdf.length);
});
