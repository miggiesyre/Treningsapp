import { after, NextResponse, type NextRequest } from 'next/server';
import { athleteId } from '@/lib/strava/auth';
import { ensureWebhook, exchangeCode, saveTokens } from '@/lib/strava/client';
import { syncRecent } from '@/lib/strava/sync';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const home = (q: string) => {
    const r = NextResponse.redirect(new URL(`/hjem?strava=${q}`, req.url));
    r.cookies.delete({ name: 'strava_state', path: '/api/strava' });
    return r;
  };
  const id = await athleteId();
  if (!id) return NextResponse.redirect(new URL('/login', req.url));
  const p = req.nextUrl.searchParams;
  const state = req.cookies.get('strava_state')?.value;
  if (!state || p.get('state') !== state) return home('feil');
  if (p.get('error') || !p.get('code')) return home('avbrutt');
  if (!(p.get('scope') ?? '').includes('activity:read_all')) return home('tilgang');
  try {
    await saveTokens(id, await exchangeCode(p.get('code')!));
  } catch (e) {
    console.error('strava callback', e);
    return home('feil');
  }
  const origin = req.nextUrl.origin;
  after(async () => {
    try {
      await ensureWebhook(origin);
    } catch (e) {
      console.error('strava webhook', e);
    }
    try {
      await syncRecent(id, 30);
    } catch (e) {
      console.error('strava sync', e);
    }
  });
  return home('ok');
}
