import { AppShell } from '@/components/app-shell';
import { getMe } from '@/lib/me';

export default async function RoleLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe('coach');
  return (
    <AppShell role="coach" name={me.name} theme={me.theme}>
      {children}
    </AppShell>
  );
}
