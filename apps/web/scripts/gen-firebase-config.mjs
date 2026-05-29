import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
};

const outDir = resolve(__dirname, '..', 'lib');
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, 'firebase-config.generated.json');

if (!config.apiKey) {
  console.log('[gen-firebase-config] SKIP — no NEXT_PUBLIC_FIREBASE_API_KEY in env, leaving existing file untouched at', outPath);
  process.exit(0);
}

writeFileSync(outPath, JSON.stringify(config, null, 2));
console.log('[gen-firebase-config] WROTE', outPath, '— apiKey:', `${config.apiKey.slice(0, 8)}...`);
