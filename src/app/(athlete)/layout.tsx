import { AppShell } from '@/components/app-shell';
import { getMe } from '@/lib/me';
import { CoachProvider } from '@/lib/plan/coach-data';
import { createClient } from '@/lib/supabase/server';

export default async function RoleLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe('athlete');
  const supabase = await createClient();
  const { data: link } = await supabase.from('coach_athlete').select('coach_id').eq('athlete_id', me.id).limit(1).maybeSingle();
  return (
    <AppShell role="athlete" name={me.name} theme={me.theme}>
      {link ? (
        <CoachProvider athleteId={me.id} coachId={link.coach_id}>
          {children}
        </CoachProvider>
      ) : (
        <p style={{ color: 'var(--muted)' }}>Kontoen din er ikke koblet til en trener ennå.</p>
      )}
    </AppShell>
  );
}
