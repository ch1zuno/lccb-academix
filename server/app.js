import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { query } from './db.js';
// Pre-load error middleware so unhandled API errors stay JSON.
import { notFound, errorHandler } from './middleware/errors.js';
// Route registration happens in server/routes/index.js
import routes from './routes/index.js';

/* The assembled Express app — shared by `node server/index.js` (long-running
 * local/dev server) and the Vercel serverless entry (`api/index.js`). The pg
 * Pool is created lazily on first query, so importing this module never
 * touches the database. */
export const app = express();

// Vercel terminates TLS and forwards the client IP via X-Forwarded-For;
// without this the per-IP login limiter would bucket every visitor together.
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: config.frontendOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

const loginLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  // Only FAILED attempts count: the demo workspace switcher performs a real
  // login per role change, and rehearsals must never trip a 429 on stage.
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  message: { error: 'Too many failed attempts. Try again in a minute.' },
});

app.use('/api/auth/login', loginLimiter);
app.use('/api', routes);

/* Real health: proves the API *and* its database are reachable. Returns 503
 * (with the reason) when the pool is down or DATABASE_URL is unset. */
app.get('/api/health', async (_req, res) => {
  const started = Date.now();
  res.set('Cache-Control', 'no-store');
  try {
    await query('SELECT 1');
    res.json({ ok: true, database: 'up', latencyMs: Date.now() - started });
  } catch (e) {
    res.status(503).json({
      ok: false,
      database: 'down',
      error: e.status === 503 ? e.message : 'database unreachable',
      latencyMs: Date.now() - started,
    });
  }
});

app.use(notFound);
app.use(errorHandler);
