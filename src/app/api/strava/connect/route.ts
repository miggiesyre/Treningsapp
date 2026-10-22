import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { athleteId } from '@/lib/strava/auth';
import { authorizeUrl } from '@/lib/strava/client';

// "Koble til Strava": redirect to Strava's consent page with a one-time state cookie.
export async function GET(req: NextRequest) {
  if (!(await athleteId())) return NextResponse.redirect(new URL('/login', req.url));
  const state = randomBytes(16).toString('hex');
  const res = NextResponse.redirect(authorizeUrl(`${req.nextUrl.origin}/api/strava/callback`, state));
  res.cookies.set('strava_state', state, { httpOnly: true, secure: true, sameSite: 'lax', path: '/api/strava', maxAge: 600 });
  return res;
}
