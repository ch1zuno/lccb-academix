/* Vercel serverless entry for the Academix API.
 * Serves the exact same Express app as the local `node server/index.js`,
 * minus the embedded-Postgres boot (the pg Pool connects straight to the
 * remote DATABASE_URL, e.g. the hosted Supabase cluster). The URL is
 * normalized to an `/api` prefix so the app mounts at the same path in
 * every deployment shape. */
import { app } from '../server/app.js';

export default function handler(req, res) {
  const u = req.url || '/';
  if (!u.startsWith('/api')) req.url = u.startsWith('/') ? `/api${u}` : `/api/${u}`;
  return app(req, res);
}
