import test from 'node:test';
import assert from 'node:assert/strict';
import {
  awardWithinCap,
  WEEKLY_LEARNER_SESSION_CAP,
  WEEKLY_TUTOR_SESSION_CAP,
} from './points.js';

test('awardWithinCap grants the full amount below the weekly cap', () => {
  assert.equal(awardWithinCap(50, 0, WEEKLY_TUTOR_SESSION_CAP), 50);
  assert.equal(awardWithinCap(50, 450, WEEKLY_TUTOR_SESSION_CAP), 50);
});

test('awardWithinCap truncates the final award at the cap', () => {
  assert.equal(awardWithinCap(50, 480, WEEKLY_TUTOR_SESSION_CAP), 20);
  assert.equal(awardWithinCap(25, 240, WEEKLY_LEARNER_SESSION_CAP), 10);
});

test('awardWithinCap never goes negative or above the request', () => {
  assert.equal(awardWithinCap(50, 500, WEEKLY_TUTOR_SESSION_CAP), 0);
  assert.equal(awardWithinCap(50, 900, WEEKLY_TUTOR_SESSION_CAP), 0);
  assert.equal(awardWithinCap(-10, 0, 500), 0);
  assert.equal(awardWithinCap(10.9, 0, 500), 10);
});
