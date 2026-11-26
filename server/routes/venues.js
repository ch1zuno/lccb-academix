import express from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { httpError } from '../middleware/errors.js';
import { audit, requestIp } from '../lib/audit.js';
import {
  YMD_RE,
  UUID_RE,
  timeToMinutes,
  parseDurationHours,
  rangesOverlap,
} from '../lib/booking.js';

const router = express.Router();

/**
 * GET /venues — approved campus venues for Face-to-Face booking.
 * Faculty/superadmin can pass ?includeInactive=1 to manage disabled spaces.
 * Optional ?date=YYYY-MM-DD&time=2:00+PM&durationHours=1 annotates `available`
 * against active Face-to-Face sessions so the picker shows booked spaces live.
 */
router.get('/venues', requireAuth, async (req, res, next) => {
  try {
    const canSeeAll = req.user.role === 'faculty' || req.user.role === 'superadmin';
    const includeInactive = canSeeAll && (req.query.includeInactive === '1' || req.query.includeInactive === 'true');
    const { rows } = await query(
      `SELECT id, name, building, room, capacity, is_active, created_at
         FROM campus_venues
        ${includeInactive ? '' : 'WHERE is_active = true'}
        ORDER BY is_active DESC, building ASC, name ASC`,
    );

    const date = req.query.date ? String(req.query.date).trim() : null;
    const startMinutes = req.query.time ? timeToMinutes(req.query.time) : null;
    if (date && YMD_RE.test(date) && startMinutes != null) {
      const durationHours = parseDurationHours(req.query.durationHours, { defaultHours: 1 });
      const endMinutes = startMinutes + Math.round(durationHours * 60);
      const excludeSessionId = req.query.excludeSessionId && UUID_RE.test(String(req.query.excludeSessionId))
        ? String(req.query.excludeSessionId)
        : null;
      const params = [date];
      let excludeClause = '';
      if (excludeSessionId) {
        params.push(excludeSessionId);
        excludeClause = ` AND id <> $${params.length}`;
      }
      const { rows: booked } = await query(
        `SELECT venue_id, time, COALESCE(duration_hours, 1) AS duration_hours
           FROM sessions
          WHERE date = $1 AND mode = 'face_to_face' AND venue_id IS NOT NULL
            AND status IN ('upcoming', 'in-progress')${excludeClause}`,
        params,
      );
      const busyVenues = new Set();
      for (const s of booked) {
        const sStart = timeToMinutes(s.time);
        if (sStart == null) continue;
        const sEnd = sStart + Math.max(0.5, Number(s.duration_hours) || 1) * 60;
        if (rangesOverlap(startMinutes, endMinutes, sStart, sEnd)) {
          busyVenues.add(s.venue_id);
        }
      }
      return res.json({
        venues: rows.map((v) => ({ ...v, available: v.is_active && !busyVenues.has(v.id) })),
      });
    }

    res.json({ venues: rows.map((v) => ({ ...v, available: v.is_active })) });
  } catch (e) { next(e); }
});

/** POST /venues — faculty or superadmin adds an approved campus venue. */
router.post('/venues', requireAuth, requireRole('faculty', 'superadmin'), async (req, res, next) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    const building = String(req.body?.building ?? '').trim().slice(0, 80);
    const room = String(req.body?.room ?? '').trim().slice(0, 40);
    const capacity = req.body?.capacity === undefined ? 6 : Number(req.body.capacity);

    if (name.length < 2 || name.length > 80) {
      throw httpError(400, 'Venue name must be between 2 and 80 characters');
    }
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 200) {
      throw httpError(400, 'Capacity must be a whole number between 1 and 200');
    }

    const { rows } = await query(
      `INSERT INTO campus_venues (name, building, room, capacity, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, building, room, capacity, is_active, created_at`,
      [name, building, room, capacity, req.user.id],
    );
    await audit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'venue.create',
      entity: 'campus_venue',
      entityId: rows[0].id,
      detail: { name, building, room, capacity },
      ip: requestIp(req),
    });
    res.status(201).json({ venue: rows[0] });
  } catch (e) {
    if (e.code === '23505') {
      e.status = 409;
      e.message = 'A campus venue with that name already exists';
    }
    next(e);
  }
});

/** PATCH /venues/:id — faculty or superadmin updates or toggles a campus venue. */
router.patch('/venues/:id', requireAuth, requireRole('faculty', 'superadmin'), async (req, res, next) => {
  try {
    if (!UUID_RE.test(String(req.params.id))) throw httpError(400, 'Invalid venue id');
    const sets = [];
    const params = [];

    if (req.body?.name !== undefined) {
      const name = String(req.body.name).trim();
      if (name.length < 2 || name.length > 80) throw httpError(400, 'Venue name must be 2–80 characters');
      params.push(name);
      sets.push(`name = $${params.length}`);
    }
    if (req.body?.building !== undefined) {
      params.push(String(req.body.building).trim().slice(0, 80));
      sets.push(`building = $${params.length}`);
    }
    if (req.body?.room !== undefined) {
      params.push(String(req.body.room).trim().slice(0, 40));
      sets.push(`room = $${params.length}`);
    }
    if (req.body?.capacity !== undefined) {
      const cap = Number(req.body.capacity);
      if (!Number.isInteger(cap) || cap < 1 || cap > 200) throw httpError(400, 'Capacity must be 1–200');
      params.push(cap);
      sets.push(`capacity = $${params.length}`);
    }
    if (req.body?.is_active !== undefined) {
      if (typeof req.body.is_active !== 'boolean') throw httpError(400, 'is_active must be boolean');
      params.push(req.body.is_active);
      sets.push(`is_active = $${params.length}`);
    }

    if (sets.length === 0) throw httpError(400, 'Provide at least one field to update');

    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE campus_venues SET ${sets.join(', ')}
        WHERE id = $${params.length}
        RETURNING id, name, building, room, capacity, is_active, updated_at`,
      params,
    );
    if (!rows[0]) throw httpError(404, 'Campus venue not found');

    await audit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'venue.update',
      entity: 'campus_venue',
      entityId: rows[0].id,
      detail: { name: rows[0].name, is_active: rows[0].is_active },
      ip: requestIp(req),
    });
    res.json({ venue: rows[0] });
  } catch (e) {
    if (e.code === '23505') {
      e.status = 409;
      e.message = 'Another campus venue already uses that name';
    }
    next(e);
  }
});

export default router;
