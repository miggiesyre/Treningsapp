import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt, encrypt, webhookVerifyToken } from './crypto';

const API = 'https://www.strava.com/api/v3';
const OAUTH = 'https://www.strava.com/oauth';

export type Tokens = { access_token: string; refresh_token: string; expires_at: number; owner_id: number };

export type StravaActivity = {
  id: number;
  name: string;
  sport_type?: string;
  type?: string;
  start_date: string;
  start_date_local: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  average_watts?: number;
  average_heartrate?: number;
  total_elevation_gain?: number;
  map?: { summary_polyline?: string | null; polyline?: string | null };
};

export function stravaEnv() {
  const id = process.env.STRAVA_CLIENT_ID;
  const secret = process.env.STRAVA_CLIENT_SECRET;
  if (!id || !secret) throw new Error('STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET is not set');
  return { id, secret };
}

export const authorizeUrl = (redirectUri: string, state: string) =>
  `${OAUTH}/authorize?${new URLSearchParams({
    client_id: stravaEnv().id,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
    state,
  })}`;

async function tokenRequest(body: Record<string, string>) {
  const { id, secret } = stravaEnv();
  const r = await fetch(`${OAUTH}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: id, client_secret: secret, ...body }),
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`Strava token ${r.status}`);
  return (await r.json()) as { access_token: string; refresh_token: string; expires_at: number; athlete?: { id: number }; scope?: string };
}

export async function exchangeCode(code: string): Promise<Tokens> {
  const t = await tokenRequest({ code, grant_type: 'authorization_code' });
  if (!t.athlete) throw new Error('Strava: missing athlete');
  return { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at, owner_id: t.athlete.id };
}

export async function saveTokens(athleteId: string, t: Tokens) {
  const db = createAdminClient();
  const { error } = await db
    .from('integration_secrets')
    .upsert({ athlete_id: athleteId, provider: 'strava', ciphertext: encrypt(t), updated_at: new Date().toISOString() });
  if (error) throw error;
}

async function loadTokens(athleteId: string): Promise<Tokens | null> {
  const db = createAdminClient();
  const { data } = await db.from('integration_secrets').select('ciphertext').eq('athlete_id', athleteId).eq('provider', 'strava').maybeSingle();
  return data ? decrypt<Tokens>(data.ciphertext) : null;
}

export async function isConnected(athleteId: string) {
  const db = createAdminClient();
  const { data } = await db.from('integration_secrets').select('athlete_id').eq('athlete_id', athleteId).eq('provider', 'strava').maybeSingle();
  return !!data;
}

/** Our athlete for a Strava owner_id (from webhook events). One row per athlete, so a scan is fine. */
export async function athleteForOwner(ownerId: number): Promise<string | null> {
  const db = createAdminClient();
  const { data } = await db.from('integration_secrets').select('athlete_id, ciphertext').eq('provider', 'strava');
  for (const r of data ?? []) {
    try {
      if (decrypt<Tokens>(r.ciphertext).owner_id === ownerId) return r.athlete_id;
    } catch {}
  }
  return null;
}

/** A valid access token, refreshed and re-saved when it is about to expire. */
export async function accessToken(athleteId: string): Promise<string | null> {
  const t = await loadTokens(athleteId);
  if (!t) return null;
  if (t.expires_at - 120 > Date.now() / 1000) return t.access_token;
  const n = await tokenRequest({ grant_type: 'refresh_token', refresh_token: t.refresh_token });
  const next = { ...t, access_token: n.access_token, refresh_token: n.refresh_token, expires_at: n.expires_at };
  await saveTokens(athleteId, next);
  return next.access_token;
}

async function get<T>(token: string, path: string): Promise<T | null> {
  const r = await fetch(`${API}${path}`, { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Strava ${path} ${r.status}`);
  return (await r.json()) as T;
}

export const getActivity = (token: string, id: number) => get<StravaActivity>(token, `/activities/${id}`);

export async function listActivities(token: string, afterUnix: number) {
  const out: StravaActivity[] = [];
  for (let page = 1; page <= 5; page++) {
    const list = await get<StravaActivity[]>(token, `/athlete/activities?after=${afterUnix}&per_page=100&page=${page}`);
    if (!list?.length) break;
    out.push(...list);
    if (list.length < 100) break;
  }
  return out;
}

export async function disconnect(athleteId: string) {
  const t = await loadTokens(athleteId);
  if (t) {
    try {
      await fetch(`${OAUTH}/deauthorize`, { method: 'POST', headers: { authorization: `Bearer ${t.access_token}` }, cache: 'no-store' });
    } catch {}
  }
  const db = createAdminClient();
  await db.from('integration_secrets').delete().eq('athlete_id', athleteId).eq('provider', 'strava');
}

/**
 * Makes sure the app has a webhook subscription pointing at this deployment. Strava allows one per
 * app and calls our GET endpoint synchronously to verify it.
 */
export async function ensureWebhook(origin: string) {
  const { id, secret } = stravaEnv();
  const callback = `${origin}/api/strava/webhook`;
  const q = new URLSearchParams({ client_id: id, client_secret: secret });
  const r = await fetch(`${API}/push_subscriptions?${q}`, { cache: 'no-store' });
  const subs = r.ok ? ((await r.json()) as { id: number; callback_url: string }[]) : [];
  if (subs.some((s) => s.callback_url === callback)) return;
  for (const s of subs) await fetch(`${API}/push_subscriptions/${s.id}?${q}`, { method: 'DELETE', cache: 'no-store' });
  const body = new URLSearchParams({ client_id: id, client_secret: secret, callback_url: callback, verify_token: webhookVerifyToken() });
  const c = await fetch(`${API}/push_subscriptions`, { method: 'POST', body, cache: 'no-store' });
  if (!c.ok) throw new Error(`Strava webhook ${c.status}: ${await c.text()}`);
}
