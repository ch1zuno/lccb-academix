import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAllowedLccbEmail,
  alternateLccbEmail,
  deriveDisplayName,
  verifyGoogleIdentity,
} from '../routes/auth.js';

test('isAllowedLccbEmail accepts @lccbonline.edu.ph and @lccbacolod.edu.ph', () => {
  assert.equal(isAllowedLccbEmail('cemerdaniel.miranda@lccbonline.edu.ph'), true);
  assert.equal(isAllowedLccbEmail('  STUDENT.NAME@LCCBONLINE.EDU.PH  '), true);
  assert.equal(isAllowedLccbEmail('b.tisuela@lccbacolod.edu.ph'), true);
});

test('isAllowedLccbEmail rejects personal and spoofed domains', () => {
  assert.equal(isAllowedLccbEmail('juan.delacruz@gmail.com'), false);
  assert.equal(isAllowedLccbEmail('user@yahoo.com'), false);
  assert.equal(isAllowedLccbEmail('user@evil-lccbonline.edu.ph'), false);
  assert.equal(isAllowedLccbEmail('user@lccbonline.edu.ph.attacker.com'), false);
  assert.equal(isAllowedLccbEmail('a@b@lccbonline.edu.ph'), false);
  assert.equal(isAllowedLccbEmail('bad email@lccbonline.edu.ph'), false);
  assert.equal(isAllowedLccbEmail('@lccbonline.edu.ph'), false);
  assert.equal(isAllowedLccbEmail(''), false);
  assert.equal(isAllowedLccbEmail(null), false);
});

test('alternateLccbEmail swaps @lccbonline.edu.ph and @lccbacolod.edu.ph', () => {
  assert.equal(
    alternateLccbEmail('m.antipo@lccbonline.edu.ph'),
    'm.antipo@lccbacolod.edu.ph',
  );
  assert.equal(
    alternateLccbEmail('b.tisuela@lccbacolod.edu.ph'),
    'b.tisuela@lccbonline.edu.ph',
  );
  assert.equal(alternateLccbEmail('juan@gmail.com'), null);
  assert.equal(alternateLccbEmail('invalid'), null);
});

test('deriveDisplayName formats email local parts cleanly', () => {
  assert.equal(deriveDisplayName('juan.delacruz@lccbonline.edu.ph'), 'Juan Delacruz');
  assert.equal(deriveDisplayName('maria_santos-reyes@lccbonline.edu.ph'), 'Maria Santos Reyes');
});

test('verifyGoogleIdentity validates OAuth access tokens via userinfo', async () => {
  const mockFetch = async (url, init) => {
    assert.equal(url, 'https://www.googleapis.com/oauth2/v3/userinfo');
    assert.equal(init.headers.Authorization, 'Bearer tok-123');
    return {
      ok: true,
      async json() {
        return {
          email: 'CemerDaniel.Miranda@lccbonline.edu.ph',
          email_verified: true,
          name: 'Cemer Daniel L. Miranda',
          picture: 'https://lh3.googleusercontent.com/avatar.jpg',
        };
      },
    };
  };

  const identity = await verifyGoogleIdentity({ accessToken: 'tok-123' }, { fetchImpl: mockFetch });
  assert.deepEqual(identity, {
    email: 'cemerdaniel.miranda@lccbonline.edu.ph',
    name: 'Cemer Daniel L. Miranda',
    picture: 'https://lh3.googleusercontent.com/avatar.jpg',
    mode: 'oauth_token',
  });
});

test('verifyGoogleIdentity validates ID token audience when googleClientId is set', async () => {
  const mockFetch = async (url) => {
    assert.match(url, /^https:\/\/oauth2\.googleapis\.com\/tokeninfo\?id_token=jwt-abc/);
    return {
      ok: true,
      async json() {
        return {
          email: 'student@lccbonline.edu.ph',
          email_verified: 'true',
          aud: 'wrong-client.apps.googleusercontent.com',
          name: 'Student',
        };
      },
    };
  };

  await assert.rejects(
    verifyGoogleIdentity(
      { credential: 'jwt-abc' },
      { fetchImpl: mockFetch, googleClientId: 'expected-client.apps.googleusercontent.com' },
    ),
    (err) => err.status === 401 && /audience mismatch/i.test(err.message),
  );
});

test('verifyGoogleIdentity enforces config.demoMode on demoEmail', async () => {
  const allowed = await verifyGoogleIdentity(
    { demoEmail: 'm.antipo@lccbonline.edu.ph', demoName: 'Mark Antipo' },
    { demoMode: true },
  );
  assert.deepEqual(allowed, {
    email: 'm.antipo@lccbonline.edu.ph',
    name: 'Mark Antipo',
    picture: null,
    mode: 'demo',
  });

  await assert.rejects(
    verifyGoogleIdentity({ demoEmail: 'm.antipo@lccbonline.edu.ph' }, { demoMode: false }),
    (err) => err.status === 401 && /disabled/i.test(err.message),
  );
});

test('verifyGoogleIdentity rejects missing credentials with 400', async () => {
  await assert.rejects(
    verifyGoogleIdentity({}),
    (err) => err.status === 400,
  );
});

