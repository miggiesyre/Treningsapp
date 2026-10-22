import { notFound } from 'next/navigation';
import { ClientOnly } from '@/components/client-only';
import { SessionPage } from '@/components/athlete/session-page';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  return (
    <ClientOnly>
      <SessionPage id={id} />
    </ClientOnly>
  );
}
