import { query } from '../db.js';

/**
 * Best-effort append-only audit trail. A missing audit table (e.g. a hosted
 * database that has not run migration 005 yet) must never break the user's
 * action, so failures are logged and swallowed.
 *
 * Pass a transaction client when the audit row must commit with the action.
 */
export function audit(entry, client = null) {
  const {
    actorId = null,
    actorRole = null,
    action,
    entity,
    entityId = null,
    detail = null,
    ip = null,
  } = entry;
  const runner = client ? client.query.bind(client) : query;
  return runner(
    `INSERT INTO audit_log (actor_id, actor_role, action, entity, entity_id, detail, ip)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
    [actorId, actorRole, action, entity, entityId, detail == null ? null : JSON.stringify(detail), ip],
  ).catch((e) => console.error('audit:', e.message));
}

/** Normalizes the proxied client IP for the audit row. */
export function requestIp(req) {
  return String(req?.headers?.['x-forwarded-for'] || req?.ip || '')
    .split(',')[0]
    .trim()
    .slice(0, 80) || null;
}
