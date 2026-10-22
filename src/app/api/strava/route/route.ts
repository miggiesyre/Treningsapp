import { NextResponse, type NextRequest } from 'next/server';
import { athleteId } from '@/lib/strava/auth';
import { accessToken, getActivity } from '@/lib/strava/client';
import { createAdminClient } from '@/lib/supabase/admin';

/** Google encoded polyline → [lat, lng][]. */
function decode(s: string) {
  const out: [number, number][] = [];
  let i = 0;
  let lat = 0;
  let lng = 0;
  while (i < s.length) {
    for (const k of [0, 1]) {
      let b;
      let shift = 0;
      let res = 0;
      do {
        b = s.charCodeAt(i++) - 63;
        res |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20 && i < s.length);
      const d = res & 1 ? ~(res >> 1) : res >> 1;
      if (k === 0) lat += d;
      else lng += d;
    }
    out.push([lat / 1e5, lng / 1e5]);
  }
  return out;
}

/** The GPS route of one of Miguel's activities for the SoMe "Rute" card, normalised to 0–1 (north up). */
export async function GET(req: NextRequest) {
  const id = await athleteId();
  if (!id) return NextResponse.json({ pts: null }, { status: 401 });
  const aid = req.nextUrl.searchParams.get('id') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(aid)) return NextResponse.json({ pts: null }, { status: 400 });
  const db = createAdminClient();
  const { data } = await db.from('activities').select('external_id').eq('id', aid).eq('athlete_id', id).eq('source', 'strava').maybeSingle();
  if (!data) return NextResponse.json({ pts: null });
  try {
    const token = await accessToken(id);
    if (!token) return NextResponse.json({ pts: null });
    const a = await getActivity(token, Number(data.external_id));
    const poly = a?.map?.summary_polyline || a?.map?.polyline;
    if (!poly) return NextResponse.json({ pts: null });
    const ll = decode(poly);
    if (ll.length < 2) return NextResponse.json({ pts: null });
    const k = Math.cos((ll[0][0] * Math.PI) / 180);
    const xy = ll.map(([la, lo]) => [lo * k, -la]);
    const xs = xy.map((p) => p[0]);
    const ys = xy.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    const span = Math.max(Math.max(...xs) - x0, Math.max(...ys) - y0) || 1;
    const ox = (span - (Math.max(...xs) - x0)) / 2;
    const oy = (span - (Math.max(...ys) - y0)) / 2;
    const step = Math.max(1, Math.floor(xy.length / 400));
    const pts = xy.filter((_, i) => i % step === 0 || i === xy.length - 1).map(([x, y]) => [0.04 + ((x - x0 + ox) / span) * 0.92, 0.04 + ((y - y0 + oy) / span) * 0.92]);
    return NextResponse.json({ pts }, { headers: { 'cache-control': 'private, max-age=3600' } });
  } catch (e) {
    console.error('strava route', e);
    return NextResponse.json({ pts: null });
  }
}
