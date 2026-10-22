'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Supabase's default invite/reset e-mails land on /login#access_token=…&refresh_token=…&type=recovery.
// Turn that into a cookie session, then send the user on to choose a password.
export function HashSession() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const access_token = hash.get('access_token');
    const refresh_token = hash.get('refresh_token');
    if (!access_token || !refresh_token) return;
    history.replaceState(null, '', window.location.pathname);

    createClient()
      .auth.setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) return setFailed(true);
        const type = hash.get('type');
        window.location.replace(type === 'recovery' || type === 'invite' ? '/nytt-passord' : '/');
      });
  }, []);

  return failed ? (
    <span className="lg-msg" role="status">
      Lenken er utløpt eller allerede brukt. Be om en ny.
    </span>
  ) : null;
}
