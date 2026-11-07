import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';

/* Central server configuration. Demo mode is on in development and must be
 * explicitly enabled in production (`DEMO_MODE=1`); a production build that
 * forgets the flag hides the role switcher and refuses the shared demo
 * password instead of exposing four seeded accounts to the internet. */
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const config = {
  port: Number(process.env.PORT) || 4000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  deviceApiKey: process.env.DEVICE_API_KEY || 'dev-device-key',
  frontendOrigins: allowedOrigins,
  demoMode: process.env.DEMO_MODE === '1' || (process.env.DEMO_MODE !== '0' && !isProd),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  centrifugoSecret: process.env.CENTRIFUGO_SECRET || '',
  centrifugoProxySecret: process.env.CENTRIFUGO_PROXY_SECRET || '',
  isProd,
};
