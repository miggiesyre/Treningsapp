import 'server-only';
import { createClient } from '@/lib/supabase/server';

/** The logged-in athlete's id, or null. Role always comes from profiles. */
export async function athleteId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return data?.role === 'athlete' ? user.id : null;
}

/** Same-origin check for state-changing POSTs. */
export function sameOrigin(req: Request) {
  const o = req.headers.get('origin');
  return !o || o === new URL(req.url).origin;
}
