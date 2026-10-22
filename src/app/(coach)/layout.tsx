import { AppShell } from '@/components/app-shell';
import { getMe } from '@/lib/me';
import { CoachProvider } from '@/lib/plan/coach-data';
import { createClient } from '@/lib/supabase/server';

export default async function RoleLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe('coach');
  const supabase = await createClient();
  const { data: link } = await supabase.from('coach_athlete').select('athlete_id').eq('coach_id', me.id).limit(1).maybeSingle();
  return (
    <AppShell role="coach" name={me.name} theme={me.theme}>
      {link ? (
        <CoachProvider athleteId={link.athlete_id} coachId={me.id}>
          {children}
        </CoachProvider>
      ) : (
        <p style={{ color: 'var(--muted)' }}>Ingen utøver er koblet til kontoen din ennå.</p>
      )}
    </AppShell>
  );
}
