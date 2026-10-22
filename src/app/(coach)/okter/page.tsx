import { ClientOnly } from '@/components/client-only';
import { Library } from '@/components/coach/library';

export default function Page() {
  return (
    <ClientOnly>
      <Library />
    </ClientOnly>
  );
}
