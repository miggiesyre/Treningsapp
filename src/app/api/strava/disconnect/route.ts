import { NextResponse } from 'next/server';
import { athleteId, sameOrigin } from '@/lib/strava/auth';
import { disconnect } from '@/lib/strava/client';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const id = await athleteId();
  if (!id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  await disconnect(id);
  return NextResponse.json({ ok: true });
}
