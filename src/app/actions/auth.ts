'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { isTheme, type Theme } from '@/lib/roles';
import { isLimited, recordAttempt } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

export type AuthState = { msg?: string; email?: string };

const GENERIC = 'Feil e-post eller passord';
const THEME_COOKIE = { maxAge: 60 * 60 * 24 * 365, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' } as const;

export async function authAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  return form.get('intent') === 'forgot' ? forgot(email) : login(email, password);
}

async function login(email: string, password: string): Promise<AuthState> {
  if (!email || !password) return { msg: GENERIC, email };
  if (await isLimited('login')) return { msg: GENERIC, email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    await recordAttempt('login');
    return { msg: GENERIC, email };
  }

  const { data: profile } = await supabase.from('profiles').select('theme').eq('id', data.user.id).maybeSingle();
  if (isTheme(profile?.theme)) (await cookies()).set('theme', profile.theme, THEME_COOKIE);
  redirect('/');
}

async function forgot(email: string): Promise<AuthState> {
  if (!email) return { msg: 'Skriv inn e-posten din først' };
  const sent = { msg: `Lenke for nytt passord er sendt til ${email}`, email };
  // Same answer whether or not the account exists, and whether or not we are rate-limited.
  if (await isLimited('reset')) return sent;
  await recordAttempt('reset');

  const h = await headers();
  const origin = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/nytt-passord` });
  if (error) console.error('reset email failed', error.message);
  return sent;
}

export async function setPassword(_prev: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get('password') ?? '');
  const repeat = String(form.get('repeat') ?? '');
  if (password.length < 12) return { msg: 'Passordet må ha minst 12 tegn' };
  if (password !== repeat) return { msg: 'Passordene er ikke like' };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === 'weak_password') return { msg: 'Passordet er for svakt eller har vært lekket. Velg et annet.' };
    if (error.code === 'same_password') return { msg: 'Velg et annet passord enn det gamle' };
    return { msg: 'Kunne ikke lagre passordet. Prøv igjen.' };
  }
  redirect('/');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function saveTheme(theme: Theme) {
  if (!isTheme(theme)) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('profiles').update({ theme }).eq('id', user.id);
  (await cookies()).set('theme', theme, THEME_COOKIE);
}
