import { after, NextResponse, type NextRequest } from 'next/server';
import { athleteForOwner, disconnect } from '@/lib/strava/client';
import { webhookVerifyToken } from '@/lib/strava/crypto';
import { removeOne, syncOne } from '@/lib/strava/sync';

export const maxDuration = 60;

// Strava verifies the subscription with a GET.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (p.get('hub.mode') !== 'subscribe' || p.get('hub.verify_token') !== webhookVerifyToken()) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return NextResponse.json({ 'hub.challenge': p.get('hub.challenge') });
}

type Event = { object_type: 'activity' | 'athlete'; object_id: number; aspect_type: 'create' | 'update' | 'delete'; owner_id: number; updates?: Record<string, string> };

// Events must be acknowledged within 2 s, so the work runs after the response.
// Events are only hints: every change is re-fetched from Strava with our own token.
export async function POST(req: NextRequest) {
  let ev: Event;
  try {
    ev = (await req.json()) as Event;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  after(async () => {
    try {
      const id = await athleteForOwner(Number(ev.owner_id));
      if (!id) return;
      if (ev.object_type === 'athlete' && ev.updates?.authorized === 'false') return disconnect(id);
      if (ev.object_type !== 'activity') return;
      if (ev.aspect_type === 'delete') await removeOne(id, Number(ev.object_id));
      else await syncOne(id, Number(ev.object_id));
    } catch (e) {
      console.error('strava event', e);
    }
  });
  return NextResponse.json({ ok: true });
}
