import type { Metadata } from 'next';
import Link from 'next/link';
import { cityById } from '@/lib/cities';
import { listEvents } from '@/lib/data';
import { toMetadata } from '@/lib/seo/engine';

export const metadata: Metadata = toMetadata({
  title: 'Karadeniz Etkinlikleri',
  description: 'Karadeniz’deki konserler, festivaller, kültür-sanat etkinlikleri, spor organizasyonları ve yerel etkinlikler. Yalnızca yayındaki herkese açık kayıtlar listelenir.',
  path: '/events',
  index: true,
  type: 'website',
});

export default async function EventsPage() {
  const events = await listEvents({ limit: 40 });
  const now = Date.now();
  const upcoming = events.filter((event) => new Date(event.starts_at).getTime() >= now);
  const past = events.filter((event) => new Date(event.starts_at).getTime() < now);
  return (
    <section className="block">
      <div className="wrap">
        <h1>Karadeniz etkinlikleri</h1>
        <p className="lead">Karadeniz’deki konserler, festivaller, kültür-sanat etkinlikleri, spor organizasyonları ve yerel etkinlikler.</p>
        <h2 className="app-section">Yaklaşan</h2>
        {upcoming.length === 0 ? <p className="empty">Yaklaşan herkese açık etkinlik yok.</p> : null}
        <div className="stack">
          {upcoming.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`} className="event-card">
              {event.cover_url ? <img src={event.cover_url} alt="" /> : null}
              <strong>{event.title}</strong>
              <span>
                {new Date(event.starts_at).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}
                {cityById(event.region_id) ? ` · ${cityById(event.region_id)?.name}` : ''}
              </span>
            </Link>
          ))}
        </div>
        <h2 className="app-section">Arşiv</h2>
        <div className="stack">
          {past.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`} className="event-card">
              <strong>{event.title}</strong>
              <span>{new Date(event.starts_at).toLocaleDateString('tr-TR')}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
