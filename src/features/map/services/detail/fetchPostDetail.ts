import { supabase } from '@/lib/supabase/client';
import { formatDate, regionName, type MapDetailRecord } from './shared';

export async function fetchPostDetail(id: string): Promise<MapDetailRecord | null> {
  const { data } = await supabase
    .from('posts')
    .select('id, title, content, media_urls, region_id, view_count, latitude, longitude, created_at, author_id')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;

  const { data: author } = await supabase
    .from('profiles')
    .select('full_name, username')
    .eq('id', data.author_id)
    .maybeSingle();

  const authorLabel = author?.full_name ?? (author?.username ? `@${author.username}` : '—');

  return {
    type: 'posts',
    id: data.id,
    title: data.title ?? 'Paylaşım',
    subtitle: authorLabel,
    description: data.content,
    latitude: data.latitude,
    longitude: data.longitude,
    createdAt: data.created_at,
    mediaUrls: data.media_urls ?? [],
    fields: [
      { label: 'Yazar', value: authorLabel },
      { label: 'Bölge', value: regionName(data.region_id) ?? '—' },
      { label: 'Görüntülenme', value: String(data.view_count) },
      { label: 'Paylaşım', value: formatDate(data.created_at) ?? '—' },
    ],
  };
}
