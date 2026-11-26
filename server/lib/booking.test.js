import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMode,
  parseDurationHours,
  timeToMinutes,
  minutesToTimeLabel,
  rangesOverlap,
  formatModeLabel,
  formatDurationLabel,
} from './booking.js';
import { buildQrMatrix } from '../../src/lib/qrSvg.js';

test('parseMode enforces face_to_face | online and rejects invalid values', () => {
  assert.equal(parseMode('face_to_face'), 'face_to_face');
  assert.equal(parseMode('online'), 'online');
  assert.equal(parseMode(undefined, { defaultOnline: true }), 'online');
  assert.throws(() => parseMode(undefined, { defaultOnline: false }), (e) => e.status === 400);
  assert.throws(() => parseMode(''), (e) => e.status === 400);
  assert.throws(() => parseMode(null), (e) => e.status === 400);
  assert.throws(() => parseMode('hybrid'), (e) => e.status === 400);
  assert.throws(() => parseMode('in-person'), (e) => e.status === 400);
});

test('parseDurationHours enforces allowed session lengths', () => {
  assert.equal(parseDurationHours(undefined), 1);
  assert.equal(parseDurationHours(0.5), 0.5);
  assert.equal(parseDurationHours('1.5'), 1.5);
  assert.equal(parseDurationHours(2), 2);
  assert.throws(() => parseDurationHours(0), (e) => e.status === 400);
  assert.throws(() => parseDurationHours(3), (e) => e.status === 400);
  assert.throws(() => parseDurationHours('two'), (e) => e.status === 400);
  assert.equal(formatDurationLabel(0.5), '30 min');
  assert.equal(formatDurationLabel(1), '1 hr');
  assert.equal(formatDurationLabel(1.5), '1.5 hrs');
  assert.equal(formatModeLabel('face_to_face'), 'Face to Face');
  assert.equal(formatModeLabel('online'), 'Online');
});

test('timeToMinutes, minutesToTimeLabel, and rangesOverlap detect clashes accurately', () => {
  assert.equal(timeToMinutes('9:00 AM'), 540);
  assert.equal(timeToMinutes('12:00 PM'), 720);
  assert.equal(timeToMinutes('3:30 PM'), 930);
  assert.equal(minutesToTimeLabel(930), '3:30 PM');
  assert.equal(timeToMinutes('25:00 PM'), null);

  // Back-to-back sessions (9:00–10:00 and 10:00–11:00) do not overlap
  assert.equal(rangesOverlap(540, 600, 600, 660), false);
  // Overlapping 1.5hr session (9:00–10:30) and 10:00–11:00 clash
  assert.equal(rangesOverlap(540, 630, 600, 660), true);
});

test('buildQrMatrix builds a valid square QR matrix with 3 finder patterns', () => {
  const url = 'https://lccb-academix.vercel.app/checkin?session=00000000-0000-4000-8000-000000000001&code=123456-654321';
  const qr = buildQrMatrix(url);
  assert.ok(qr.size >= 21 && qr.size <= 41);
  assert.equal(qr.matrix.length, qr.size);
  assert.equal(qr.matrix[0].length, qr.size);
  // Top-left, top-right, bottom-left finder corners must be dark
  assert.equal(qr.matrix[0][0], 1);
  assert.equal(qr.matrix[0][qr.size - 1], 1);
  assert.equal(qr.matrix[qr.size - 1][0], 1);
  // Center of top-left finder (3,3) is dark; inner ring (1,1) is light
  assert.equal(qr.matrix[3][3], 1);
  assert.equal(qr.matrix[1][1], 0);
});
