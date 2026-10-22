import { NextResponse } from 'next/server';
import { athleteId, sameOrigin } from '@/lib/strava/auth';
import { syncRecent } from '@/lib/strava/sync';

export const maxDuration = 60;

// "Synk nå" in Innstillinger.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const id = await athleteId();
  if (!id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    return NextResponse.json({ count: await syncRecent(id, 14) });
  } catch (e) {
    console.error('strava sync', e);
    return NextResponse.json({ error: 'sync' }, { status: 502 });
  }
}
