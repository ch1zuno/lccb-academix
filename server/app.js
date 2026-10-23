import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
// Pre-load error middleware so unhandled API errors stay JSON.
import { notFound, errorHandler } from './middleware/errors.js';
// Route registration happens in server/routes/index.js
import routes from './routes/index.js';

/* The assembled Express app — shared by `node server/index.js` (long-running
 * local/dev server) and the Vercel serverless entry (`api/index.js`). The pg
 * Pool is created lazily on first query, so importing this module never
 * touches the database. */
export const app = express();

app.use(helmet());
app.use(cors({ origin: config.frontendOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

const loginLimiter = rateLimit({ windowMs: 60_000, max: 20, message: { error: 'Too many attempts. Try in a minute.' } });

app.use('/api/auth/login', loginLimiter);
app.use('/api', routes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use(notFound);
app.use(errorHandler);
