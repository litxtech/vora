import { eventCategoryLabel, isEventActiveOnMap } from '@/features/events/constants';
import { supabase } from '@/lib/supabase/client';
import { formatDate, regionName, type MapDetailRecord } from './shared';

export async function fetchEventDetail(id: string): Promise<MapDetailRecord | null> {
  const { data } = await supabase
    .from('events')
    .select(
      `id, title, description, location_name, starts_at, ends_at, region_id, latitude, longitude,
       cover_url, view_count, max_attendees, category, map_category, organizer_id, created_at,
       ticket_type, ticket_price_cents, qr_token, status,
       profiles!events_organizer_id_fkey (username, full_name)`,
    )
    .eq('id', id)
    .maybeSingle();
  if (!data || data.status !== 'published' || !isEventActiveOnMap(data.starts_at, data.ends_at)) return null;
  const organizer = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
  return {
    type: 'events',
    id: data.id,
    title: data.title,
    subtitle: data.location_name ?? 'Etkinlik',
    description: data.description,
    coverUrl: data.cover_url,
    latitude: data.latitude,
    longitude: data.longitude,
    createdAt: data.created_at,
    ownerId: data.organizer_id,
    eventMeta: {
      ticketType: (data.ticket_type as 'free' | 'paid') ?? 'free',
      ticketPriceCents: data.ticket_price_cents,
      qrToken: data.qr_token,
      startsAt: data.starts_at,
      endsAt: data.ends_at,
      category: data.category,
      mapCategory: data.map_category,
      maxAttendees: data.max_attendees,
      viewCount: data.view_count ?? 0,
    },
    fields: [
      { label: 'Organizatör', value: organizer?.full_name ?? organizer?.username ?? '—' },
      { label: 'Kategori', value: eventCategoryLabel(data.category) },
      {
        label: 'Bilet',
        value:
          data.ticket_type === 'paid'
            ? `Ücretli · ${((data.ticket_price_cents ?? 0) / 100).toFixed(2)} TRY`
            : 'Ücretsiz',
      },
      { label: 'Başlangıç', value: formatDate(data.starts_at) ?? '—' },
      { label: 'Bitiş', value: formatDate(data.ends_at) ?? '—' },
      { label: 'Konum', value: data.location_name ?? '—' },
      { label: 'Bölge', value: regionName(data.region_id) ?? '—' },
      { label: 'Görüntülenme', value: String(data.view_count ?? 0) },
      ...(data.max_attendees ? [{ label: 'Katılımcı limiti', value: String(data.max_attendees) }] : []),
    ],
  };
}
