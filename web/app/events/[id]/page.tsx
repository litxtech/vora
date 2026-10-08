import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs, CtaBand, JsonLd, ShareBar } from '@/components/site';
import { cityById } from '@/lib/cities';
import { getEvent } from '@/lib/data';
import { breadcrumbLd, graph, toMetadata, trimDescription } from '@/lib/seo/engine';
import { absoluteUrl } from '@/lib/site';

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return { title: 'Etkinlik bulunamadı', robots: { index: false, follow: false } };
  const ended = event.ends_at ? new Date(event.ends_at).getTime() < Date.now() : new Date(event.starts_at).getTime() < Date.now() - 86400000;
  return toMetadata({
    title: event.title,
    description: trimDescription(event.description),
    path: `/events/${event.id}`,
    index: event.description.trim().length >= 80,
    follow: true,
    type: 'article',
    image: event.cover_url,
    ...(ended ? {} : {}),
  });
}

export default async function EventPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();
  const city = cityById(event.region_id);
  const ended = new Date(event.ends_at ?? event.starts_at).getTime() < Date.now();
  const crumbs = [
    { name: 'Ana sayfa', path: '/' },
    { name: 'Etkinlikler', path: '/events' },
    { name: event.title, path: `/events/${event.id}` },
  ];
  return (
    <article className="block">
      <JsonLd
        data={graph([
          breadcrumbLd(crumbs),
          {
            '@type': 'Event',
            name: event.title,
            description: event.description,
            startDate: event.starts_at,
            endDate: event.ends_at ?? undefined,
            eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
            eventStatus: ended ? 'https://schema.org/EventScheduled' : 'https://schema.org/EventScheduled',
            location: {
              '@type': 'Place',
              name: event.location_name || city?.name || 'Karadeniz',
              address: city?.name,
            },
            organizer: event.organizer_name
              ? { '@type': 'Person', name: event.organizer_name }
              : { '@type': 'Organization', name: 'Vora' },
            image: event.cover_url ?? undefined,
            url: absoluteUrl(`/events/${event.id}`),
          },
        ])}
      />
      <div className="wrap prose">
        <Breadcrumbs items={crumbs} />
        <h1>{event.title}</h1>
        <p className="meta">
          <time dateTime={event.starts_at}>{new Date(event.starts_at).toLocaleString('tr-TR')}</time>
          {city ? (
            <>
              {' · '}
              <Link href={`/city/${city.id}`}>{city.name}</Link>
            </>
          ) : null}
          {ended ? ' · Arşiv' : ''}
        </p>
        {event.cover_url ? <img src={event.cover_url} alt="" /> : null}
        <p>{event.description}</p>
        {event.location_name ? <p>Yer: {event.location_name}</p> : null}
        {event.organizer_username ? (
          <p>
            Organizatör:{' '}
            <Link href={`/u/${event.organizer_username}`}>{event.organizer_name || event.organizer_username}</Link>
          </p>
        ) : (
          <p>Organizatör profili herkese açık değil.</p>
        )}
        <ShareBar path={absoluteUrl(`/events/${event.id}`)} title={event.title} />
      </div>
      <CtaBand />
    </article>
  );
}
