import { createPost } from '@/lib/app-actions';
import { CITIES } from '@/lib/cities';
import { requireProfile } from '@/lib/session';

export default async function ComposePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { profile } = await requireProfile();
  const { error } = await searchParams;
  return (
    <>
      <h1>Paylaş</h1>
      <form className="stack auth-card" action={createPost}>
        {error ? <p className="form-error">Paylaşım kaydedilemedi. Metin ve şehir seçili olmalı.</p> : null}
        <label htmlFor="content">Ne paylaşmak istiyorsun?</label>
        <textarea id="content" name="content" required maxLength={4000} />
        <label htmlFor="region_id">Şehir</label>
        <select id="region_id" name="region_id" defaultValue={profile?.region_id ?? ''} required>
          <option value="">Şehir seç</option>
          {CITIES.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
        <label htmlFor="audience">Kimler görsün</label>
        <select id="audience" name="audience" defaultValue="public">
          <option value="public">Herkes</option>
          <option value="friends">Arkadaşlar</option>
        </select>
        <button className="btn" type="submit">
          Paylaş
        </button>
      </form>
    </>
  );
}
