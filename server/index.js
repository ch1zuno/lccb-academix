import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { ensurePostgres } from './pg-embed.js';
import { config } from './config.js';
// Pre-load error middleware so unhandled Sinatra / API errors stay JSON.
import { notFound, errorHandler } from './middleware/errors.js';
// Route registration happens in server/routes/index.js
import routes from './routes/index.js';

const app = express();
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

ensurePostgres()
  .then(() => app.listen(config.port, () => console.log('API ready on port', config.port)))
  .catch(e => { console.error('Failed to start database:', e.message); process.exit(1); });
