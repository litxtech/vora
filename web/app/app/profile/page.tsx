import Link from 'next/link';
import { updateProfile } from '@/lib/app-actions';
import { CITIES } from '@/lib/cities';
import { requireProfile } from '@/lib/session';

export default async function ProfileSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { profile, user } = await requireProfile();
  const { saved, error } = await searchParams;
  return (
    <>
      <div className="app-head">
        <h1>Profil</h1>
        <Link className="btn ghost" href="/app/settings">
          Ayarlar
        </Link>
      </div>
      {profile?.username ? (
        <p>
          Herkese açık adresin: <Link href={`/u/${profile.username}`}>@{profile.username}</Link>
        </p>
      ) : (
        <p className="muted">{user.email}</p>
      )}
      {saved ? <p className="form-ok">Profilin kaydedildi.</p> : null}
      {error ? <p className="form-error">Profil kaydedilemedi.</p> : null}
      <form className="stack auth-card" action={updateProfile}>
        <label htmlFor="full_name">Ad soyad</label>
        <input id="full_name" name="full_name" defaultValue={profile?.full_name ?? ''} />
        <label htmlFor="bio">Hakkında</label>
        <textarea id="bio" name="bio" defaultValue={profile?.bio ?? ''} maxLength={500} />
        <label htmlFor="region_id">Şehir</label>
        <select id="region_id" name="region_id" defaultValue={profile?.region_id ?? ''}>
          <option value="">Şehir seç</option>
          {CITIES.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
        <button className="btn" type="submit">
          Kaydet
        </button>
      </form>
    </>
  );
}
