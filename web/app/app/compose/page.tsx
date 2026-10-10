import { OfflineCompose } from '@/components/offline/offline-compose';
import { CITIES } from '@/lib/cities';
import { requireProfile } from '@/lib/session';

export default async function ComposePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { profile } = await requireProfile();
  const { error } = await searchParams;
  return (
    <>
      <h1>Paylaş</h1>
      {error ? <p className="form-error">Paylaşım kaydedilemedi. Metin ve şehir seçili olmalı.</p> : null}
      <OfflineCompose cities={CITIES.map((city) => ({ id: city.id, name: city.name }))} defaultRegion={profile?.region_id ?? ''} />
    </>
  );
}
