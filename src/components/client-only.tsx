'use client';

import { useEffect, useState } from 'react';

/**
 * Renders children only in the browser. Pages that depend on "today" use it so the server
 * (UTC on Vercel) and the phone (Norwegian time) never disagree about the date around midnight.
 */
export function ClientOnly({ children }: { children: React.ReactNode }) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(true), []);
  return on ? <>{children}</> : null;
}
