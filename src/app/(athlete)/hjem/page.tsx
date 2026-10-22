import { Home } from '@/components/athlete/home';
import { ClientOnly } from '@/components/client-only';

export default function Page() {
  return (
    <ClientOnly>
      <Home />
    </ClientOnly>
  );
}
