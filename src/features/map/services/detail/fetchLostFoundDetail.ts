import { lostCategoryLabel } from '@/features/lost-found/constants';
import { supabase } from '@/lib/supabase/client';
import { formatDate, regionName, type MapDetailRecord } from './shared';

export async function fetchLostFoundDetail(
  id: string,
  trackView = true,
): Promise<MapDetailRecord | null> {
  const { data } = await supabase
    .from('lost_items')
    .select(
      `id, title, description, item_type, category, contact_info, status, region_id,
       district, location_name, media_urls, is_urgent, reward_amount, view_count,
       latitude, longitude, last_seen_at, created_at, author_id`,
    )
    .eq('id', id)
    .maybeSingle();
  if (!data || data.status !== 'open') return null;

  if (trackView) {
    await supabase.rpc('increment_lost_item_view', { p_item_id: id });
  }

  return {
    type: 'lost_found',
    id: data.id,
    title: data.title,
    subtitle: data.item_type === 'lost' ? 'Kayıp ilanı' : 'Buluntu ilanı',
    description: data.description,
    mediaUrls: data.media_urls ?? [],
    latitude: data.latitude,
    longitude: data.longitude,
    createdAt: data.created_at,
    ownerId: data.author_id,
    lostMeta: {
      itemType: data.item_type as 'lost' | 'found',
      category: data.category,
      status: data.status as 'open' | 'resolved',
      isUrgent: data.is_urgent,
      rewardAmount: data.reward_amount,
      contactInfo: data.contact_info,
      district: data.district,
      viewCount: data.view_count ?? 0,
      lastSeenAt: data.last_seen_at,
    },
    fields: [
      { label: 'Tür', value: data.item_type === 'lost' ? 'Kayıp' : 'Buluntu' },
      { label: 'Kategori', value: lostCategoryLabel(data.category) },
      { label: 'Durum', value: data.status === 'open' ? 'Açık' : 'Çözüldü' },
      { label: 'İletişim', value: data.contact_info ?? '—' },
      { label: 'Konum', value: data.location_name ?? data.district ?? '—' },
      { label: 'Bölge', value: regionName(data.region_id) ?? '—' },
      { label: 'Görüntülenme', value: String(data.view_count ?? 0) },
      ...(data.reward_amount ? [{ label: 'Ödül', value: data.reward_amount }] : []),
      ...(data.is_urgent ? [{ label: 'Öncelik', value: 'Acil' }] : []),
      { label: 'İlan', value: formatDate(data.created_at) ?? '—' },
    ],
  };
}
