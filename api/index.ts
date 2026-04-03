import 'dotenv/config.js';

// Ensure consistent timezone in serverless environments.
process.env.TZ = 'Etc/UTC';

// Prisma expects DATABASE_URL from schema.prisma (env("DATABASE_URL")).
// Locally you likely load it via .env, but on Vercel you might only set DB_* vars.
if (!process.env.DATABASE_URL) {
  const dbHost = process.env.DB_HOST;
  const dbPort = process.env.DB_PORT;
  const dbName = process.env.DB_NAME;
  const dbUser = process.env.DB_USER;
  const dbPw = process.env.DB_PW;

  if (dbHost && dbPort && dbName && dbUser && dbPw) {
    const user = encodeURIComponent(dbUser);
    const pw = encodeURIComponent(dbPw);
    // Supabase/Postgres commonly requires SSL (sslmode=require).
    process.env.DATABASE_URL = `postgresql://${user}:${pw}@${dbHost}:${dbPort}/${dbName}?schema=public&sslmode=require`;
  }
}

// Import after env is set so Prisma can initialize with DATABASE_URL.
const appModule = await import('../dist/app.js');
export default appModule.default;

