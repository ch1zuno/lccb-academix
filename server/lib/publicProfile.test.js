import test from 'node:test';
import assert from 'node:assert/strict';
import { toPublicProfile } from './publicProfile.js';

test('toPublicProfile returns only public-safe fields', () => {
  const sensitiveUser = {
    id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    name: 'Maria Santos',
    email: 'maria.santos@lccbacolod.edu.ph',
    password_hash: '$2a$12$e80yJpY...',
    token_version: 4,
    role: 'tutor',
    bio: 'Passionate peer tutor in Computer Science and Math.',
    avatar: '👩‍🏫',
    has_avatar: true,
  };

  const subjects = [
    { code: 'IT-101', name: 'Intro to Computing', department: 'IT' },
    { code: 'MATH-201', name: 'Discrete Math', department: 'Math' },
  ];

  const publicProfile = toPublicProfile(sensitiveUser, subjects);

  // Must have public-safe fields
  assert.equal(publicProfile.name, 'Maria Santos');
  assert.equal(publicProfile.bio, 'Passionate peer tutor in Computer Science and Math.');
  assert.equal(publicProfile.avatar, '/api/users/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d/avatar');
  assert.equal(publicProfile.role, 'tutor');
  assert.deepEqual(publicProfile.subjects, subjects);

  // Must NEVER expose sensitive internal identifiers or credentials
  assert.equal(publicProfile.id, undefined);
  assert.equal(publicProfile.email, undefined);
  assert.equal(publicProfile.password_hash, undefined);
  assert.equal(publicProfile.token_version, undefined);
});

test('toPublicProfile omits subjects for non-tutor roles', () => {
  const learnerUser = {
    id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    name: 'Jose Rizal',
    email: 'jose.rizal@lccbacolod.edu.ph',
    role: 'learner',
    bio: 'Studying hard for finals.',
    has_avatar: false,
    avatar: null,
  };

  const publicProfile = toPublicProfile(learnerUser);
  assert.equal(publicProfile.name, 'Jose Rizal');
  assert.equal(publicProfile.role, 'learner');
  assert.equal(publicProfile.subjects, undefined);
  assert.equal(publicProfile.email, undefined);
  assert.equal(publicProfile.id, undefined);
});

test('toPublicProfile caps bio at 280 characters', () => {
  const longBio = 'A'.repeat(500);
  const user = {
    name: 'Juan Dela Cruz',
    role: 'faculty',
    bio: longBio,
  };

  const publicProfile = toPublicProfile(user);
  assert.equal(publicProfile.bio.length, 280);
});
