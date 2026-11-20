import { loadEnv } from './env';

// Sprint 0 stub: validates config and starts. pg-boss job handlers arrive in Sprint 8.
const env = loadEnv();

console.info(JSON.stringify({ level: 'info', msg: 'worker ready', env: env.APP_ENV }));
