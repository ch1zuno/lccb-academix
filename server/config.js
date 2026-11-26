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

const DEFAULT_JWT_SECRETS = new Set([
  'dev-secret-change-me',
  'change-me-dev',
  'dev-jitsi-room-secret-change-me',
]);
const DEFAULT_DEVICE_KEYS = new Set(['dev-device-key']);

export function validateProductionSecrets(cfg) {
  if (!cfg.isProd) return;
  if (!cfg.jwtSecret || DEFAULT_JWT_SECRETS.has(cfg.jwtSecret) || cfg.jwtSecret.length < 16) {
    throw new Error('FATAL: Production JWT_SECRET must be set to a strong non-default secret (16+ chars).');
  }
  if (cfg.deviceApiKey && (DEFAULT_DEVICE_KEYS.has(cfg.deviceApiKey) || cfg.deviceApiKey.length < 16)) {
    throw new Error('FATAL: Production DEVICE_API_KEY must be a non-default secret (16+ chars).');
  }
  if (!cfg.jitsiRoomSecret || DEFAULT_JWT_SECRETS.has(cfg.jitsiRoomSecret) || cfg.jitsiRoomSecret.length < 16) {
    throw new Error('FATAL: Production JITSI_ROOM_SECRET must be a non-default secret (16+ chars).');
  }
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || (isProd ? '' : 'dev-secret-change-me'),
  deviceApiKey: process.env.DEVICE_API_KEY || (isProd ? '' : 'dev-device-key'),
  frontendOrigins: allowedOrigins,
  demoMode: process.env.DEMO_MODE === '1' || (process.env.DEMO_MODE !== '0' && !isProd),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  centrifugoSecret: process.env.CENTRIFUGO_SECRET || '',
  centrifugoProxySecret: process.env.CENTRIFUGO_PROXY_SECRET || '',
  jitsiRoomSecret: process.env.JITSI_ROOM_SECRET || process.env.JWT_SECRET || (isProd ? '' : 'dev-jitsi-room-secret-change-me'),
  jitsiDomain: process.env.VITE_JITSI_DOMAIN || process.env.JITSI_DOMAIN || 'meet.jit.si',
  googleClientId: process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '',
  allowedEmailDomains: (process.env.ALLOWED_EMAIL_DOMAINS || 'lccbonline.edu.ph,lccbacolod.edu.ph')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean),
  isProd,
};

validateProductionSecrets(config);
