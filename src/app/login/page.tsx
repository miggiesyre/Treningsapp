import { HashSession } from './hash-session';
import { LoginForm } from './login-form';

const NOTICES: Record<string, string> = {
  profil: 'Kontoen er ikke satt opp ennå.',
  lenke: 'Lenken er utløpt eller allerede brukt. Be om en ny.',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  return (
    <div className="lg">
      <LoginForm notice={e ? NOTICES[e] : undefined} />
      <HashSession />
    </div>
  );
}
