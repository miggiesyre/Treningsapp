import { Progress } from '@/components/athlete/progress';
import { ClientOnly } from '@/components/client-only';

export default function Page() {
  return (
    <ClientOnly>
      <Progress />
    </ClientOnly>
  );
}
