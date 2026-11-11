import { cpSync, existsSync } from 'node:fs';

// Exercise the same standalone output used by Docker, including static assets.
if (!existsSync('.next/standalone/server.js')) {
  throw new Error('Build the standalone app with npm run build before running browser tests.');
}
cpSync('public', '.next/standalone/public', { recursive: true });
cpSync('.next/static', '.next/standalone/.next/static', { recursive: true });
process.env.PORT = '3100';
process.env.HOSTNAME = '127.0.0.1';
await import('../.next/standalone/server.js');
