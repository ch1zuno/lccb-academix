import test from 'node:test';
import assert from 'node:assert/strict';
import {
  manilaTodayYmd,
  manilaNowMinutes,
  manilaEndOfDayDate,
  computeSessionCutoff,
} from './sessionLifecycle.js';

test('Asia/Manila date & time helpers convert UTC instants accurately', () => {
  // 2026-11-26 15:30:00 UTC == 2026-11-26 23:30:00 Asia/Manila
  const lateManila = new Date('2026-11-26T15:30:00.000Z');
  assert.equal(manilaTodayYmd(lateManila), '2026-11-26');
  assert.equal(manilaNowMinutes(lateManila), 23 * 60 + 30);

  // 2026-11-26 16:05:00 UTC == 2026-11-27 00:05:00 Asia/Manila
  const pastMidnightManila = new Date('2026-11-26T16:05:00.000Z');
  assert.equal(manilaTodayYmd(pastMidnightManila), '2026-11-27');
  assert.equal(manilaNowMinutes(pastMidnightManila), 5);

  const eod = manilaEndOfDayDate('2026-11-26');
  assert.equal(eod.toISOString(), '2026-11-26T16:00:00.000Z');
});

test('computeSessionCutoff gives regular sessions end-of-day Manila and late-night Now sessions midnight grace', () => {
  const regular = computeSessionCutoff({ date: '2026-11-26', isNow: false, durationHours: 1 });
  assert.equal(regular.toISOString(), '2026-11-26T16:00:00.000Z');

  // Now session started at 23:45 Asia/Manila (15:45 UTC) for 1 hr -> grace extends to 01:00+08 (17:00 UTC)
  const startedLate = new Date('2026-11-26T15:45:00.000Z');
  const lateCutoff = computeSessionCutoff({
    date: '2026-11-26',
    isNow: true,
    startedAt: startedLate,
    durationHours: 1,
  });
  assert.equal(lateCutoff.toISOString(), '2026-11-26T17:00:00.000Z');

  // Late Now session with 2hr duration capped at 02:00+08 next day (18:00 UTC)
  const cappedCutoff = computeSessionCutoff({
    date: '2026-11-26',
    isNow: true,
    startedAt: startedLate,
    durationHours: 2,
  });
  assert.equal(cappedCutoff.toISOString(), '2026-11-26T18:00:00.000Z');
});
