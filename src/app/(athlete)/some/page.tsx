import { Some } from '@/components/athlete/some';
import { ClientOnly } from '@/components/client-only';

export default function Page() {
  return (
    <ClientOnly>
      <Some />
    </ClientOnly>
  );
}
