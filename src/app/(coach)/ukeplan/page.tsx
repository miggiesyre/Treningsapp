import { ClientOnly } from '@/components/client-only';
import { WeekPlan } from '@/components/coach/week-plan';

export default function Page() {
  return (
    <ClientOnly>
      <WeekPlan />
    </ClientOnly>
  );
}
