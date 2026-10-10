import Link from 'next/link';
import { CENTER_GROUPS, MOBILE_CENTERS } from '@/lib/mobile-centers';
import { requireProfile } from '@/lib/session';

export default async function CentersPage() {
  await requireProfile();
  return (
    <>
      <h1>Merkezler</h1>
      <p className="muted">Telefondaki merkezlerin aynı listesi. Birine gir, ilanları gör.</p>
      {CENTER_GROUPS.map((group) => {
        const items = MOBILE_CENTERS.filter((center) => center.group === group);
        if (items.length === 0) return null;
        return (
          <section key={group} className="center-group">
            <h2>{group}</h2>
            <div className="center-grid">
              {items.map((center) => (
                <Link key={center.slug} href={`/app/centers/${center.slug}`} className="center-card" style={{ borderColor: center.accent }}>
                  <strong>{center.title}</strong>
                  <span>{center.subtitle}</span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
