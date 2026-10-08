import type { Metadata } from 'next';
import Link from 'next/link';
import { displayName, listProfiles } from '@/lib/data';
import { cityById } from '@/lib/cities';
import { toMetadata } from '@/lib/seo/engine';

export const metadata: Metadata = toMetadata({
  title: 'İnsanlar',
  description: 'Vora’da herkese açık profiller. Özel profiller bu listede yer almaz.',
  path: '/people',
  index: true,
  type: 'website',
});

export default async function PeoplePage() {
  const people = await listProfiles(48);
  return (
    <section className="block">
      <div className="wrap">
        <h1>İnsanlar</h1>
        <p>Yalnızca herkese açık, aktif ve silinmemiş profiller.</p>
        {people.length === 0 ? <p className="empty">Listelenecek profil yok.</p> : null}
        <div className="grid-3">
          {people.map((person) => (
            <Link className="card" key={person.id} href={`/u/${person.username}`}>
              <h2>{displayName(person.full_name, person.username)}</h2>
              <p className="meta">
                @{person.username}
                {person.region_id ? ` · ${cityById(person.region_id)?.name ?? ''}` : ''}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
