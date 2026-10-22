import { ZonesPage } from '@/components/athlete/zones';
import { ClientOnly } from '@/components/client-only';

export default function Page() {
  return (
    <ClientOnly>
      <ZonesPage />
    </ClientOnly>
  );
}
