import 'server-only';
import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from 'node:crypto';

// AES-256-GCM for integration tokens. The key is TOKEN_ENC_KEY (32 bytes, base64) when set,
// otherwise derived from SUPABASE_SECRET_KEY – anyone holding that key can read the table anyway.
function key(): Buffer {
  const k = process.env.TOKEN_ENC_KEY;
  if (k) {
    const b = Buffer.from(k, 'base64');
    if (b.length !== 32) throw new Error('TOKEN_ENC_KEY must be 32 bytes, base64');
    return b;
  }
  const s = process.env.SUPABASE_SECRET_KEY;
  if (!s) throw new Error('SUPABASE_SECRET_KEY is not set');
  return Buffer.from(hkdfSync('sha256', s, 'treningsapp', 'integration-token-enc', 32));
}

export function encrypt(obj: unknown): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64');
}

export function decrypt<T>(s: string): T {
  const b = Buffer.from(s, 'base64');
  const d = createDecipheriv('aes-256-gcm', key(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8')) as T;
}

/** Token Strava echoes back when verifying the webhook subscription. */
export function webhookVerifyToken() {
  const s = process.env.STRAVA_CLIENT_SECRET ?? '';
  return createHmac('sha256', s).update('strava-webhook-verify').digest('hex').slice(0, 32);
}
