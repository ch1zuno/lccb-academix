/* Local/dev entry — boots the embedded Postgres when needed and keeps a
 * long-running server on config.port. On Vercel, `api/index.js` serves the
 * same app from server/app.js as a serverless function. */
import 'dotenv/config';
import { ensurePostgres } from './pg-embed.js';
import { config } from './config.js';
import { app } from './app.js';

ensurePostgres()
  .then(() => app.listen(config.port, () => console.log('API ready on port', config.port)))
  .catch(e => { console.error('Failed to start database:', e.message); process.exit(1); });
