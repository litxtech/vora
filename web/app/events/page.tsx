import type { Metadata } from 'next';
import Link from 'next/link';
import { listEvents } from '@/lib/data';
import { toMetadata } from '@/lib/seo/engine';

export const metadata: Metadata = toMetadata({
  title: 'Etkinlikler',
  description: 'Vora’da yayındaki herkese açık etkinlikler. Geçmiş etkinlikler silinmez, arşivde kalır.',
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
        <h1>Etkinlikler</h1>
        <h2>Yaklaşan</h2>
        {upcoming.length === 0 ? <p className="empty">Yaklaşan herkese açık etkinlik yok.</p> : null}
        <ul>
          {upcoming.map((event) => (
            <li key={event.id}>
              <Link href={`/events/${event.id}`}>{event.title}</Link>
            </li>
          ))}
        </ul>
        <h2>Arşiv</h2>
        <ul>
          {past.map((event) => (
            <li key={event.id}>
              <Link href={`/events/${event.id}`}>{event.title}</Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
