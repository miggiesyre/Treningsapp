import { ClientOnly } from '@/components/client-only';
import { Alerts } from '@/components/coach/alerts';

export default function Page() {
  return (
    <ClientOnly>
      <Alerts />
    </ClientOnly>
  );
}
