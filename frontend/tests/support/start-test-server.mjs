import { cpSync, existsSync, mkdirSync } from 'node:fs';

const frontendUrl = new URL(process.env.TEST_FRONTEND_URL ?? 'http://localhost:3000');

process.env.PORT ??= frontendUrl.port || '3000';
process.env.HOSTNAME ??= '127.0.0.1';

const standaloneRoot = '.next/standalone';
const standaloneNextRoot = `${standaloneRoot}/.next`;

mkdirSync(standaloneNextRoot, { recursive: true });
if (existsSync('.next/static')) {
  cpSync('.next/static', `${standaloneNextRoot}/static`, { recursive: true });
}
if (existsSync('public')) {
  cpSync('public', `${standaloneRoot}/public`, { recursive: true });
}

await import('../../.next/standalone/server.js');
