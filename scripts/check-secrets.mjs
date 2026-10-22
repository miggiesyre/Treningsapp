// Fails if anything secret-looking ended up in the browser bundle or in tracked source.
// Run after `npm run build`:  npm run check:secrets
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// sb_secret_ alone appears in supabase-js (key-prefix check); a real key has characters after it.
const PATTERNS = [/service_role/, /sb_secret_[A-Za-z0-9_-]{8,}/, /SUPABASE_SECRET_KEY/, /STRAVA_CLIENT_SECRET/, /GARMIN_PASSWORD/, /TOKEN_ENC_KEY/];
const secret = process.env.SUPABASE_SECRET_KEY;
if (secret) PATTERNS.push(new RegExp(secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

let hits = 0;
try {
  for (const file of walk('.next/static')) {
    const text = readFileSync(file, 'utf8');
    for (const re of PATTERNS) if (re.test(text)) { console.error(`✗ ${re} found in ${file}`); hits++; }
  }
} catch {
  console.error('No .next/static – run `npm run build` first.');
  process.exit(1);
}
if (hits) process.exit(1);
console.log('✓ No secrets in the browser bundle');
