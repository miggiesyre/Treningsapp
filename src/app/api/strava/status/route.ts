import { NextResponse } from 'next/server';
import { athleteId } from '@/lib/strava/auth';
import { isConnected } from '@/lib/strava/client';

export async function GET() {
  const id = await athleteId();
  if (!id) return NextResponse.json({ connected: false, athlete: false });
  return NextResponse.json({ connected: await isConnected(id), athlete: true }, { headers: { 'cache-control': 'no-store' } });
}
