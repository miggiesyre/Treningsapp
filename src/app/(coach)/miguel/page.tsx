import { ClientOnly } from '@/components/client-only';
import { Miguel } from '@/components/coach/miguel';

export default function Page() {
  return (
    <ClientOnly>
      <Miguel />
    </ClientOnly>
  );
}
