import 'server-only';
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

const WINDOW_MS = 15 * 60 * 1000;
const LIMITS = { login: 5, reset: 3 } as const;
type Kind = keyof typeof LIMITS;

async function ipHash() {
  const h = await headers();
  // On Vercel x-real-ip / x-forwarded-for are set by the platform, not the client.
  const ip = h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  return createHash('sha256').update(`treningsapp:${ip}`).digest('hex');
}

/** True when this IP has used up its attempts. Fails closed if the check itself fails. */
export async function isLimited(kind: Kind) {
  try {
    const db = createAdminClient();
    const since = new Date(Date.now() - WINDOW_MS).toISOString();
    const { count, error } = await db
      .from('login_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', await ipHash())
      .eq('kind', kind)
      .gte('created_at', since);
    if (error) throw error;
    return (count ?? 0) >= LIMITS[kind];
  } catch (e) {
    console.error('rate-limit check failed', e);
    return true;
  }
}

export async function recordAttempt(kind: Kind) {
  try {
    const db = createAdminClient();
    await db.from('login_attempts').insert({ ip_hash: await ipHash(), kind });
    // Housekeeping: drop rows older than a day.
    await db.from('login_attempts').delete().lt('created_at', new Date(Date.now() - 864e5).toISOString());
  } catch (e) {
    console.error('rate-limit record failed', e);
  }
}
