import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { HOME, isTheme, type Role, type Theme } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export type Me = { id: string; role: Role; name: string; theme: Theme };

/** The logged-in user's profile. Redirects if missing or if the page belongs to the other role. */
export const getMe = cache(async (required?: Role): Promise<Me> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: p } = await supabase.from('profiles').select('role, full_name, theme').eq('id', user.id).maybeSingle();
  if (!p) redirect('/login?e=profil');

  const role = p.role as Role;
  if (required && role !== required) redirect(HOME[role]);
  return { id: user.id, role, name: p.full_name, theme: isTheme(p.theme) ? p.theme : 'dark' };
});
