import { Training } from '@/components/athlete/training';
import { ClientOnly } from '@/components/client-only';

export default function Page() {
  return (
    <ClientOnly>
      <Training />
    </ClientOnly>
  );
}
