import 'dotenv/config';

/* Central server configuration */
export const config = {
  port: Number(process.env.PORT) || 4000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  deviceApiKey: process.env.DEVICE_API_KEY || 'dev-device-key',
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  isProd: process.env.NODE_ENV === 'production',
};
