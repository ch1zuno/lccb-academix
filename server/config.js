import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';

/* Central server configuration. Demo mode is on in development and must be
 * explicitly enabled in production (`DEMO_MODE=1`); a production build that
 * forgets the flag hides the role switcher and refuses the shared demo
 * password instead of exposing four seeded accounts to the internet. */
export const config = {
  port: Number(process.env.PORT) || 4000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  deviceApiKey: process.env.DEVICE_API_KEY || 'dev-device-key',
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  demoMode: process.env.DEMO_MODE === '1' || (process.env.DEMO_MODE !== '0' && !isProd),
  isProd,
};
