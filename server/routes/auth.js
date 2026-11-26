import crypto from 'node:crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { query, withTransaction } from '../db.js';
import { requireAuth, requireRole, signToken, signStepUpToken } from '../middleware/auth.js';
import { config } from '../config.js';
import { audit, requestIp } from '../lib/audit.js';
import {
  clearSessionCookie,
  setSessionCookie,
  sessionTtlMsForRole,
  STEP_UP_TTL_SECONDS,
} from '../lib/sessionCookie.js';
import { isR2Configured, uploadToR2, deleteFromR2 } from '../lib/storage.js';
import {
  generateTotpSecret,
  buildOtpAuthUri,
  verifyTotpCode,
  encryptTotpSecret,
  decryptTotpSecret,
  generateRecoveryCodes,
  consumeRecoveryCode,
} from '../lib/totp.js';

const router = express.Router();
const DEV = !config.isProd;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Shared bcrypt hash used by db/seed.sql (demo1234). Refused in production when DEMO_MODE is off.
export const SEED_DEMO_HASH = '$2b$10$nthYix5Pzh3MQcOzsCmBg.DqyKeTKHM6DKfb1V/5DnTmQHtQ9VIOu';
// Constant-time comparison fallback so unknown loginIds take the same bcrypt latency as real accounts.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 10);

export function isDemoPasswordBlocked(passwordHash, cfg = config) {
  return Boolean(cfg.isProd && !cfg.demoMode && passwordHash === SEED_DEMO_HASH);
}

const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 5,
  keyGenerator: (req) => String(req.user?.id || 'anon'),
  standardHeaders: 'draft-7',
  message: { error: 'Too many password change attempts. Try again in 15 minutes.' },
});

const mfaLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 8,
  keyGenerator: (req) => (req.user?.id ? String(req.user.id) : ipKeyGenerator(req.ip || '127.0.0.1')),
  standardHeaders: 'draft-7',
  message: { error: 'Too many verification attempts. Try again in 15 minutes.' },
});

function signTotpChallenge(user) {
  return jwt.sign(
    { sub: user.id, tv: Number(user.token_version) || 0, purpose: 'totp_challenge' },
    config.jwtSecret,
    { expiresIn: 300 },
  );
}

async function verifyUserTotpOrRecovery(userRow, code) {
  const secret = decryptTotpSecret(userRow.totp_secret_enc);
  if (secret && verifyTotpCode(secret, code)) {
    return { ok: true, usedRecovery: false };
  }
  const { matched, remainingHashes } = consumeRecoveryCode(code, userRow.totp_recovery_hashes);
  if (matched) {
    await query(
      `UPDATE users SET totp_recovery_hashes = $1::jsonb WHERE id = $2`,
      [JSON.stringify(remainingHashes), userRow.id],
    );
    return { ok: true, usedRecovery: true, remainingRecoveryCount: remainingHashes.length };
  }
  return { ok: false };
}

const PUBLIC_COLUMNS = `id, custom_id, name, email, role, avatar, program, department, title,
                        is_verified, is_available, certified_by_id, token_version, totp_enabled,
                        suspended_at, suspended_reason`;

export function isAllowedLccbEmail(email, allowedDomains = config.allowedEmailDomains) {
  const norm = String(email || '').trim().toLowerCase();
  if (!norm || /\s/.test(norm)) return false;
  const parts = norm.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  return allowedDomains.includes(parts[1]);
}

export function alternateLccbEmail(email) {
  const norm = String(email || '').trim().toLowerCase();
  const parts = norm.split('@');
  if (parts.length !== 2 || !parts[0]) return null;
  if (parts[1] === 'lccbonline.edu.ph') return `${parts[0]}@lccbacolod.edu.ph`;
  if (parts[1] === 'lccbacolod.edu.ph') return `${parts[0]}@lccbonline.edu.ph`;
  return null;
}

export function deriveDisplayName(email) {
  const local = String(email || '').split('@')[0] || '';
  const words = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return words.join(' ') || 'LCCB Student';
}

export async function verifyGoogleIdentity(
  { credential, accessToken, demoEmail, demoName } = {},
  optionsOrFetch = {},
) {
  const opts = typeof optionsOrFetch === 'function' ? { fetchImpl: optionsOrFetch } : (optionsOrFetch || {});
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const demoMode = opts.demoMode !== undefined ? opts.demoMode : config.demoMode;
  const expectedClientId = opts.googleClientId !== undefined ? opts.googleClientId : config.googleClientId;

  if (accessToken) {
    const resp = await fetchImpl('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resp?.ok) {
      throw Object.assign(new Error('Google access token could not be verified'), { status: 401 });
    }
    const data = await resp.json();
    if (!data?.email || data.email_verified === false) {
      throw Object.assign(new Error('Google account email is not verified'), { status: 401 });
    }
    return {
      email: String(data.email).trim().toLowerCase(),
      name: String(data.name || '').trim(),
      picture: data.picture || null,
      mode: 'oauth_token',
    };
  }

  if (credential) {
    const resp = await fetchImpl(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
    );
    if (!resp?.ok) {
      throw Object.assign(new Error('Google ID token could not be verified'), { status: 401 });
    }
    const data = await resp.json();
    if (!data?.email || String(data.email_verified) !== 'true') {
      throw Object.assign(new Error('Google account email is not verified'), { status: 401 });
    }
    if (expectedClientId && data.aud !== expectedClientId) {
      throw Object.assign(new Error('Google token audience mismatch'), { status: 401 });
    }
    return {
      email: String(data.email).trim().toLowerCase(),
      name: String(data.name || '').trim(),
      picture: data.picture || null,
      mode: 'id_token',
    };
  }

  if (demoEmail) {
    const isDemoAllowed = demoMode || (!expectedClientId && demoMode !== false);
    if (!isDemoAllowed) {
      throw Object.assign(new Error('Demo Google sign-in is disabled in production'), { status: 401 });
    }
    const email = String(demoEmail).trim().toLowerCase();
    if (!email.includes('@')) {
      throw Object.assign(new Error('Enter a valid Google email address'), { status: 400 });
    }
    return {
      email,
      name: String(demoName || '').trim(),
      picture: null,
      mode: 'demo',
    };
  }

  throw Object.assign(new Error('Google credential or accessToken is required'), { status: 400 });
}

async function generateStudentCustomId(client) {
  for (let i = 0; i < 6; i += 1) {
    const candidate = `26-0870-${crypto.randomInt(100, 1000)}`;
    const exists = await client.query(`SELECT 1 FROM users WHERE custom_id = $1`, [candidate]);
    if (exists.rowCount === 0) return candidate;
  }
  return `LCCB-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

async function fetchFullUser(userId) {
  const { rows } = await query(
    `SELECT u.id, u.custom_id, u.name, u.email, u.role, u.avatar, u.bio, u.program, u.department, u.title,
            u.is_verified, u.is_available, u.certified_by_id, u.totp_enabled, u.suspended_at, u.suspended_reason,
            ua.r2_url,
            EXISTS(SELECT 1 FROM user_avatars ua WHERE ua.user_id = u.id) AS has_avatar
     FROM users u
     LEFT JOIN user_avatars ua ON ua.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  const user = rows[0];
  if (!user) return null;

  user.avatar_url = user.r2_url || (user.has_avatar ? `/api/users/${user.id}/avatar` : null);

  if (user.role === 'tutor' || user.role === 'faculty') {
    const subRows = await query(
      `SELECT s.id, s.code, s.name, s.department
       FROM user_subjects us
       JOIN subjects s ON s.id = us.subject_id
       WHERE us.user_id = $1
       ORDER BY s.code`,
      [userId]
    );
    user.subjects = subRows.rows;
  }
  return user;
}

/**
 * POST /api/auth/login { loginId, password }
 * loginId = custom_id (e.g. TE-128), custom_id@… style email, or email.
 */
router.post('/login', async (req, res, next) => {
  try {
    const { loginId, password } = req.body || {};
    if (!loginId || !password) {
      return res.status(400).json({ error: 'loginId and password are required' });
    }
    const key = String(loginId).trim();
    const isEmail = key.includes('@');
    const altEmail = isEmail ? alternateLccbEmail(key) : null;
    const { rows } = await query(
      `SELECT id, custom_id, name, email, role, avatar, program, department, title,
              is_verified, is_available, certified_by_id, token_version, password_hash,
              totp_enabled, totp_secret_enc, totp_recovery_hashes, suspended_at, suspended_reason
       FROM users
       WHERE custom_id ILIKE $1
          OR ($2::text IS NOT NULL AND LOWER(email) = LOWER($2))
          OR ($3::text IS NOT NULL AND LOWER(email) = LOWER($3))`,
      [key, isEmail ? key : null, altEmail],
    );
    const user = rows[0];
    const passwordMatches = bcrypt.compareSync(
      String(password),
      user?.password_hash || DUMMY_PASSWORD_HASH,
    );
    if (!user || !passwordMatches) {
      if (user && ['superadmin', 'tutor', 'faculty'].includes(user.role)) {
        await audit({
          actorId: user.id,
          actorRole: user.role,
          action: 'auth.login_failed',
          entity: 'user',
          entityId: user.id,
          detail: { reason: 'bad_password' },
          ip: requestIp(req),
        }).catch(() => {});
      }
      return res.status(401).json({ error: 'Invalid school ID / email or password' });
    }
    if (isDemoPasswordBlocked(user.password_hash)) {
      return res.status(403).json({
        error: 'Default demo password is disabled in production. Sign in with Google or contact the administrator.',
      });
    }
    if (user.totp_enabled) {
      const inlineCode = String(req.body?.totpCode ?? '').trim();
      if (!inlineCode) {
        return res.json({
          requiresTotp: true,
          challengeToken: signTotpChallenge(user),
          role: user.role,
        });
      }
      const check = await verifyUserTotpOrRecovery(user, inlineCode);
      if (!check.ok) {
        await audit({
          actorId: user.id,
          actorRole: user.role,
          action: 'auth.totp_failed',
          entity: 'user',
          entityId: user.id,
          ip: requestIp(req),
        }).catch(() => {});
        return res.status(401).json({ error: 'Invalid authenticator or recovery code' });
      }
    }
    await query(`UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);
    const token = signToken(user, { mfa: Boolean(user.totp_enabled) });
    delete user.password_hash;
    delete user.token_version;
    delete user.totp_secret_enc;
    delete user.totp_recovery_hashes;
    const fullUser = (await fetchFullUser(user.id)) || user;
    delete fullUser.token_version;
    await audit({
      actorId: user.id,
      actorRole: user.role,
      action: user.totp_enabled ? 'auth.totp_login' : 'auth.login',
      entity: 'user',
      entityId: user.id,
      ip: requestIp(req),
    });
    res.set('Cache-Control', 'no-store');
    setSessionCookie(res, token, user.role);
    res.json({ token, user: fullUser, sessionExpiresAt: Date.now() + sessionTtlMsForRole(user.role) });
  } catch (e) { next(e); }
});

/**
 * POST /api/auth/google { accessToken?, credential?, demoEmail?, demoName? }
 * Verifies Google OAuth identity, strictly enforces @lccbonline.edu.ph (and @lccbacolod.edu.ph),
 * matches seeded users across domains, or auto-provisions first-time learners with joining bonus.
 */
router.post('/google', async (req, res, next) => {
  try {
    let identity;
    try {
      identity = await verifyGoogleIdentity(req.body || {});
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      throw err;
    }

    if (!isAllowedLccbEmail(identity.email)) {
      await audit({
        action: 'auth.google_domain_rejected',
        entity: 'user',
        detail: { email: identity.email, mode: identity.mode },
        ip: requestIp(req),
      });
      return res.status(403).json({
        error: 'Access restricted: Please sign in with your official @lccbonline.edu.ph account.',
      });
    }

    const altEmail = alternateLccbEmail(identity.email);
    const existing = await query(
      `SELECT ${PUBLIC_COLUMNS}, totp_secret_enc, totp_recovery_hashes
       FROM users
       WHERE LOWER(email) = $1 OR ($2::text IS NOT NULL AND LOWER(email) = $2)
       ORDER BY (LOWER(email) = $1) DESC
       LIMIT 1`,
      [identity.email, altEmail],
    );

    let userRecord = existing.rows[0];
    // Strict exact-email pinning for superadmin: refuse cross-domain alias matching.
    if (userRecord?.role === 'superadmin' && userRecord.email.toLowerCase() !== identity.email) {
      await audit({
        actorId: userRecord.id,
        actorRole: 'superadmin',
        action: 'auth.superadmin_domain_mismatch',
        entity: 'user',
        entityId: userRecord.id,
        detail: { providedEmail: identity.email },
        ip: requestIp(req),
      }).catch(() => {});
      return res.status(403).json({
        error: 'Superadmin Google sign-in requires the exact registered institutional email.',
      });
    }
    let provisioned = false;

    if (!userRecord) {
      userRecord = await withTransaction(async (client) => {
        const recheck = await client.query(
          `SELECT ${PUBLIC_COLUMNS} FROM users WHERE LOWER(email) = $1 LIMIT 1`,
          [identity.email],
        );
        if (recheck.rows[0]) return recheck.rows[0];

        const customId = await generateStudentCustomId(client);
        const displayName = identity.name || deriveDisplayName(identity.email);
        const dummyHash = bcrypt.hashSync(crypto.randomUUID(), 10);

        const inserted = await client.query(
          `INSERT INTO users (custom_id, name, email, role, avatar, program, is_verified, is_available, password_hash)
           VALUES ($1, $2, $3, 'learner', '🎓', 'BSIT 1-A', false, true, $4)
           RETURNING ${PUBLIC_COLUMNS}`,
          [customId, displayName, identity.email, dummyHash],
        );
        const created = inserted.rows[0];

        await client.query(
          `INSERT INTO points_ledger (user_id, amount, description)
           VALUES ($1, 100, 'Academix joining bonus')`,
          [created.id],
        );
        provisioned = true;
        return created;
      });
    }

    if (userRecord.totp_enabled) {
      return res.json({
        requiresTotp: true,
        challengeToken: signTotpChallenge(userRecord),
        role: userRecord.role,
      });
    }

    await query(`UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1`, [userRecord.id]);
    const token = signToken(userRecord);
    const fullUser = (await fetchFullUser(userRecord.id)) || { ...userRecord };
    delete fullUser.token_version;
    delete fullUser.totp_secret_enc;
    delete fullUser.totp_recovery_hashes;

    await audit({
      actorId: fullUser.id,
      actorRole: fullUser.role,
      action: 'auth.google_login',
      entity: 'user',
      entityId: fullUser.id,
      detail: { email: identity.email, mode: identity.mode, provisioned },
      ip: requestIp(req),
    });

    res.set('Cache-Control', 'no-store');
    setSessionCookie(res, token, userRecord.role);
    res.json({ token, user: fullUser, sessionExpiresAt: Date.now() + sessionTtlMsForRole(userRecord.role) });
  } catch (e) { next(e); }
});

/** GET /api/auth/me → current user profile (fresh, no hash) */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await fetchFullUser(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user, sessionExpiresAt: req.authExp ? req.authExp * 1000 : null });
  } catch (e) { next(e); }
});

/**
 * PATCH /api/auth/profile
 * Allows users to edit their own profile: name, bio (max 280 plain text), avatar.
 * Tutors also edit the subjects they teach.
 */
router.patch('/profile', requireAuth, async (req, res, next) => {
  try {
    const { name, bio, avatarBase64, subjectIds } = req.body || {};
    const userId = req.user.id;

    // 1. Validate name
    let validatedName = undefined;
    if (name !== undefined) {
      const cleanName = String(name).trim();
      if (!cleanName) {
        return res.status(400).json({ error: 'Display name cannot be empty' });
      }
      if (cleanName.length > 100) {
        return res.status(400).json({ error: 'Display name must be 100 characters or fewer' });
      }
      validatedName = cleanName;
    }

    // 2. Validate bio (plain text only, max 280 chars)
    let validatedBio = undefined;
    if (bio !== undefined) {
      const cleanBio = String(bio).trim();
      if (cleanBio.length > 280) {
        return res.status(400).json({ error: 'Bio must be 280 characters or fewer' });
      }
      validatedBio = cleanBio;
    }

    // 3. Process avatar if provided
    if (avatarBase64 === null) {
      // Remove avatar
      const { rows: prevRows } = await query(`SELECT r2_key FROM user_avatars WHERE user_id = $1`, [userId]);
      if (prevRows[0]?.r2_key) {
        try { await deleteFromR2(prevRows[0].r2_key); } catch (e) { console.error('R2 delete failed:', e); }
      }
      await query(`DELETE FROM user_avatars WHERE user_id = $1`, [userId]);
    } else if (typeof avatarBase64 === 'string' && avatarBase64.trim().length > 0) {
      const cleanedBase64 = avatarBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
      const buffer = Buffer.from(cleanedBase64, 'base64');

      if (buffer.length > 500 * 1024) {
        return res.status(400).json({ error: 'Avatar image must not exceed 500 KB' });
      }

      // Check magic bytes
      let mimeType = null;
      if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        mimeType = 'image/jpeg';
      } else if (
        buffer.length >= 8 &&
        buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
        buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
      ) {
        mimeType = 'image/png';
      } else if (
        buffer.length >= 12 &&
        buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
      ) {
        mimeType = 'image/webp';
      }

      if (!mimeType) {
        return res.status(400).json({ error: 'Invalid image format. Only JPEG, PNG, and WebP are allowed.' });
      }

      if (!isR2Configured()) {
        return res.status(503).json({ error: 'Media storage is temporarily unavailable. Cloudflare R2 is required.' });
      }

      const ext = mimeType === 'image/jpeg' ? 'jpg' : (mimeType === 'image/png' ? 'png' : 'webp');
      const r2Key = `avatars/${userId}-${Date.now()}.${ext}`;
      const uploadResult = await uploadToR2({ key: r2Key, buffer, mimeType });
      const r2Url = uploadResult.url;

      const { rows: prevRows } = await query(`SELECT r2_key FROM user_avatars WHERE user_id = $1`, [userId]);
      if (prevRows[0]?.r2_key && prevRows[0].r2_key !== r2Key) {
        try { await deleteFromR2(prevRows[0].r2_key); } catch (e) { console.error('R2 delete old avatar failed:', e); }
      }

      await query(
        `INSERT INTO user_avatars (user_id, data, mime_type, size_bytes, updated_at, r2_key, r2_url)
         VALUES ($1, NULL, $2, $3, CURRENT_TIMESTAMP, $4, $5)
         ON CONFLICT (user_id) DO UPDATE
           SET data = NULL,
               mime_type = EXCLUDED.mime_type,
               size_bytes = EXCLUDED.size_bytes,
               updated_at = CURRENT_TIMESTAMP,
               r2_key = EXCLUDED.r2_key,
               r2_url = EXCLUDED.r2_url`,
        [userId, mimeType, buffer.length, r2Key, r2Url]
      );
    }

    // 4. Update accredited tutor or faculty subjects (audited)
    const canEditSubjects = req.user.role === 'faculty'
      || (req.user.role === 'tutor' && req.user.is_verified && !req.user.suspended_at);
    if (canEditSubjects && Array.isArray(subjectIds)) {
      let validUuids = [...new Set(subjectIds.filter((id) => UUID_RE.test(String(id))))];
      if (req.user.role === 'tutor' && process.env.STRICT_SUBJECT_LOCK === '1') {
        const approved = await query(
          `SELECT DISTINCT asx.subject_id
             FROM application_subjects asx
             JOIN tutor_applications a ON a.id = asx.application_id
            WHERE a.user_id = $1 AND a.status = 'approved'`,
          [userId],
        );
        if (approved.rows.length > 0) {
          const allowed = new Set(approved.rows.map((r) => r.subject_id));
          if (validUuids.some((id) => !allowed.has(id))) {
            return res.status(403).json({
              error: 'Accredited tutors can only teach subjects approved on their accreditation application.',
            });
          }
        }
      }
      await withTransaction(async (client) => {
        await client.query(`DELETE FROM user_subjects WHERE user_id = $1`, [userId]);
        if (validUuids.length > 0) {
          await client.query(
            `INSERT INTO user_subjects (user_id, subject_id)
             SELECT $1, id FROM subjects WHERE id = ANY($2::uuid[])`,
            [userId, validUuids]
          );
        }
        await audit({
          actorId: userId,
          actorRole: req.user.role,
          action: 'tutor.update_subjects',
          entity: 'user',
          entityId: userId,
          detail: { subjectCount: validUuids.length },
          ip: requestIp(req),
        }, client);
      });
    }

    // 5. Update users table
    if (validatedName !== undefined || validatedBio !== undefined) {
      await query(
        `UPDATE users
         SET name = COALESCE($1, name),
             bio = COALESCE($2, bio),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [validatedName ?? null, validatedBio ?? null, userId]
      );
    }

    await audit({
      actorId: userId,
      actorRole: req.user.role,
      action: 'user.update_profile',
      entity: 'user',
      entityId: userId,
      ip: requestIp(req),
    });

    const updatedUser = await fetchFullUser(userId);
    res.json({ ok: true, user: updatedUser });
  } catch (e) { next(e); }
});

/**
 * POST /api/auth/change-password { currentPassword, newPassword }
 * Retires the shared demo password without a mail provider: the user proves
 * the old password, gets a fresh token, and every other JWT is revoked.
 */
router.post('/change-password', requireAuth, passwordChangeLimiter, async (req, res, next) => {
  try {
    const currentPassword = String(req.body?.currentPassword ?? '');
    const newPassword = String(req.body?.newPassword ?? '');
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }
    if (newPassword.length < 10) {
      return res.status(400).json({ error: 'New password must be at least 10 characters' });
    }
    if (Buffer.byteLength(newPassword, 'utf8') > 72) {
      return res.status(400).json({ error: 'New password must be 72 bytes or fewer' });
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({ error: 'New password must be different' });
    }
    const { rows } = await query(
      `SELECT password_hash, token_version FROM users WHERE id = $1`, [req.user.id]);
    if (!rows[0] || !bcrypt.compareSync(currentPassword, rows[0].password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    const hash = bcrypt.hashSync(newPassword, 12);
    const updated = await query(
      `UPDATE users
          SET password_hash = $1, token_version = token_version + 1
        WHERE id = $2
        RETURNING ${PUBLIC_COLUMNS}`,
      [hash, req.user.id],
    );
    const fresh = updated.rows[0];
    const token = signToken(fresh, { mfa: Boolean(fresh.totp_enabled) });
    delete fresh.token_version;
    await audit({
      actorId: fresh.id,
      actorRole: fresh.role,
      action: 'auth.password_change',
      entity: 'user',
      entityId: fresh.id,
      ip: requestIp(req),
    });
    res.set('Cache-Control', 'no-store');
    setSessionCookie(res, token, fresh.role);
    res.json({ token, user: fresh, sessionExpiresAt: Date.now() + sessionTtlMsForRole(fresh.role) });
  } catch (e) { next(e); }
});

/** POST /api/auth/totp/verify-login { challengeToken, code } — finish MFA login */
router.post('/totp/verify-login', mfaLimiter, async (req, res, next) => {
  try {
    const challengeToken = String(req.body?.challengeToken ?? '').trim();
    const code = String(req.body?.code ?? '').trim();
    if (!challengeToken || !code) {
      return res.status(400).json({ error: 'challengeToken and authenticator code are required' });
    }
    let payload;
    try {
      payload = jwt.verify(challengeToken, config.jwtSecret);
    } catch {
      return res.status(401).json({ error: 'Verification challenge expired — sign in again' });
    }
    if (payload.purpose !== 'totp_challenge') {
      return res.status(401).json({ error: 'Invalid verification challenge' });
    }
    const { rows } = await query(
      `SELECT ${PUBLIC_COLUMNS}, totp_secret_enc, totp_recovery_hashes
         FROM users WHERE id = $1`,
      [payload.sub],
    );
    const user = rows[0];
    if (!user || !user.totp_enabled || Number(payload.tv ?? 0) !== Number(user.token_version ?? 0)) {
      return res.status(401).json({ error: 'Session challenge no longer valid' });
    }
    const check = await verifyUserTotpOrRecovery(user, code);
    if (!check.ok) {
      await audit({
        actorId: user.id,
        actorRole: user.role,
        action: 'auth.totp_failed',
        entity: 'user',
        entityId: user.id,
        ip: requestIp(req),
      }).catch(() => {});
      return res.status(401).json({ error: 'Invalid authenticator or recovery code' });
    }
    await query(`UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);
    const token = signToken(user, { mfa: true });
    const fullUser = (await fetchFullUser(user.id)) || user;
    delete fullUser.token_version;
    delete fullUser.totp_secret_enc;
    delete fullUser.totp_recovery_hashes;
    await audit({
      actorId: user.id,
      actorRole: user.role,
      action: check.usedRecovery ? 'auth.totp_recovery_login' : 'auth.totp_login',
      entity: 'user',
      entityId: user.id,
      ip: requestIp(req),
    });
    res.set('Cache-Control', 'no-store');
    setSessionCookie(res, token, user.role);
    res.json({
      token,
      user: fullUser,
      sessionExpiresAt: Date.now() + sessionTtlMsForRole(user.role),
      usedRecovery: check.usedRecovery,
    });
  } catch (e) { next(e); }
});

/** POST /api/auth/totp/setup — generate TOTP secret & otpauth URI for elevated roles */
router.post('/totp/setup', requireAuth, requireRole('superadmin', 'tutor', 'faculty'), async (req, res, next) => {
  try {
    const secret = generateTotpSecret();
    const encrypted = encryptTotpSecret(secret);
    await query(
      `UPDATE users SET totp_secret_enc = $1 WHERE id = $2`,
      [encrypted, req.user.id],
    );
    const otpauthUri = buildOtpAuthUri({ secret, accountName: req.user.email });
    res.set('Cache-Control', 'no-store');
    res.json({ secret, otpauthUri });
  } catch (e) { next(e); }
});

/** POST /api/auth/totp/enable { code } — verify 6-digit code, activate 2FA & return recovery codes */
router.post('/totp/enable', requireAuth, requireRole('superadmin', 'tutor', 'faculty'), mfaLimiter, async (req, res, next) => {
  try {
    const code = String(req.body?.code ?? '').trim();
    if (!code) return res.status(400).json({ error: '6-digit authenticator code is required' });
    const { rows } = await query(
      `SELECT id, role, name, totp_secret_enc, token_version FROM users WHERE id = $1`,
      [req.user.id],
    );
    const secret = decryptTotpSecret(rows[0]?.totp_secret_enc);
    if (!secret) {
      return res.status(400).json({ error: 'Start 2FA setup first before verifying a code' });
    }
    if (!verifyTotpCode(secret, code)) {
      return res.status(401).json({ error: 'Invalid 6-digit authenticator code' });
    }
    const { codes, hashes } = generateRecoveryCodes(8);
    const { rows: [updated] } = await query(
      `UPDATE users
          SET totp_enabled = true,
              totp_recovery_hashes = $1::jsonb,
              token_version = token_version + 1,
              last_active_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING ${PUBLIC_COLUMNS}`,
      [JSON.stringify(hashes), req.user.id],
    );
    const token = signToken(updated, { mfa: true });
    await audit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'auth.totp_enable',
      entity: 'user',
      entityId: req.user.id,
      ip: requestIp(req),
    });
    res.set('Cache-Control', 'no-store');
    setSessionCookie(res, token, updated.role);
    res.json({
      enabled: true,
      recoveryCodes: codes,
      token,
      user: await fetchFullUser(req.user.id),
      sessionExpiresAt: Date.now() + sessionTtlMsForRole(updated.role),
    });
  } catch (e) { next(e); }
});

/** POST /api/auth/totp/disable { currentPassword, code } — disable 2FA after double verification */
router.post('/totp/disable', requireAuth, requireRole('superadmin', 'tutor', 'faculty'), mfaLimiter, async (req, res, next) => {
  try {
    const currentPassword = String(req.body?.currentPassword ?? '');
    const code = String(req.body?.code ?? '').trim();
    if (!currentPassword || !code) {
      return res.status(400).json({ error: 'currentPassword and authenticator/recovery code are required' });
    }
    const { rows } = await query(
      `SELECT id, role, name, password_hash, totp_enabled, totp_secret_enc, totp_recovery_hashes
         FROM users WHERE id = $1`,
      [req.user.id],
    );
    const row = rows[0];
    if (!row || !bcrypt.compareSync(currentPassword, row.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    if (!row.totp_enabled) {
      return res.status(409).json({ error: '2FA is not currently enabled' });
    }
    const check = await verifyUserTotpOrRecovery(row, code);
    if (!check.ok) {
      return res.status(401).json({ error: 'Invalid authenticator or recovery code' });
    }
    const { rows: [updated] } = await query(
      `UPDATE users
          SET totp_enabled = false,
              totp_secret_enc = NULL,
              totp_recovery_hashes = NULL,
              token_version = token_version + 1
        WHERE id = $1
        RETURNING ${PUBLIC_COLUMNS}`,
      [req.user.id],
    );
    const token = signToken(updated, { mfa: false });
    await audit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'auth.totp_disable',
      entity: 'user',
      entityId: req.user.id,
      ip: requestIp(req),
    });
    res.set('Cache-Control', 'no-store');
    setSessionCookie(res, token, updated.role);
    res.json({
      disabled: true,
      token,
      user: await fetchFullUser(req.user.id),
      sessionExpiresAt: Date.now() + sessionTtlMsForRole(updated.role),
    });
  } catch (e) { next(e); }
});

/** POST /api/auth/step-up { code?, password? } — mint short-lived 10m step-up token */
router.post('/step-up', requireAuth, mfaLimiter, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, role, password_hash, token_version, totp_enabled, totp_secret_enc, totp_recovery_hashes
         FROM users WHERE id = $1`,
      [req.user.id],
    );
    const row = rows[0];
    if (!row) return res.status(404).json({ error: 'User not found' });

    if (row.totp_enabled) {
      const code = String(req.body?.code ?? '').trim();
      if (!code) return res.status(400).json({ error: 'Authenticator or recovery code is required' });
      const check = await verifyUserTotpOrRecovery(row, code);
      if (!check.ok) {
        return res.status(401).json({ error: 'Invalid authenticator or recovery code' });
      }
    } else {
      const password = String(req.body?.password ?? '');
      if (!password) return res.status(400).json({ error: 'Password is required for step-up verification' });
      if (!bcrypt.compareSync(password, row.password_hash)) {
        return res.status(401).json({ error: 'Password is incorrect' });
      }
    }

    const stepUpToken = signStepUpToken(row);
    await audit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'auth.step_up',
      entity: 'user',
      entityId: req.user.id,
      detail: { method: row.totp_enabled ? 'totp' : 'password' },
      ip: requestIp(req),
    });
    res.set('Cache-Control', 'no-store');
    res.json({ stepUpToken, expiresIn: STEP_UP_TTL_SECONDS });
  } catch (e) { next(e); }
});

/** POST /api/auth/logout - clear the browser session cookie. */
router.post('/logout', (req, res) => {
  res.set('Cache-Control', 'no-store');
  clearSessionCookie(res);
  res.json({ ok: true });
});

/** POST /api/auth/logout-all — bump token_version; every issued JWT dies. */
router.post('/logout-all', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE users SET token_version = token_version + 1
        WHERE id = $1 RETURNING token_version`, [req.user.id]);
    await audit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'auth.logout_all',
      entity: 'user',
      entityId: req.user.id,
      ip: requestIp(req),
    });
    clearSessionCookie(res);
    res.json({ revoked: true, tokenVersion: rows[0]?.token_version ?? null });
  } catch (e) { next(e); }
});

/** GET /api/auth/dev-accounts — one-line dev switcher only outside production */
router.get('/dev-accounts', async (_req, res, next) => {
  if (!DEV || !config.demoMode) return next();
  try {
    const { rows } = await query(
      `SELECT id, custom_id, name, role, program, department, title
       FROM users WHERE custom_id IN ('SA-001','FA-017','TU-042','TE-128')
       OR email = 'l.betita.admin@lccbacolod.edu.ph' ORDER BY role`,
    );
    // In dev the frontend logs in with loginId + demo password.
    res.json({ password: 'demo1234', accounts: rows });
  } catch (e) { next(e); }
});

export default router;
