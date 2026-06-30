import {
  formatVoraNeedDate,
  voraNeedCategoryLabel,
  VORA_NEED_VISIBILITY_LABELS,
} from '@/features/vora-needs/constants';
import { supabase } from '@/lib/supabase/client';
import { formatDate, regionName, type MapDetailRecord } from './shared';

export async function fetchVoraNeedDetail(
  id: string,
  trackView = true,
): Promise<MapDetailRecord | null> {
  const { data } = await supabase
    .from('vora_needs')
    .select(
      `id, title, description, category, visibility, urgency, status, region_id,
       city, image_url, is_featured, view_count, favorite_count, latitude, longitude,
       created_at, author_id`,
    )
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;

  if (trackView) {
    await supabase.rpc('increment_vora_need_view', { p_need_id: id });
  }

  return {
    type: 'vora_needs',
    id: data.id,
    title: data.title,
    subtitle: voraNeedCategoryLabel(data.category),
    description: data.description,
    mediaUrls: data.image_url ? [data.image_url] : [],
    latitude: data.latitude,
    longitude: data.longitude,
    createdAt: data.created_at,
    ownerId: data.author_id,
    fields: [
      { label: 'Kategori', value: voraNeedCategoryLabel(data.category) },
      { label: 'Görünürlük', value: VORA_NEED_VISIBILITY_LABELS[data.visibility as keyof typeof VORA_NEED_VISIBILITY_LABELS] ?? data.visibility },
      { label: 'Aciliyet', value: data.urgency === 'urgent' ? 'Acil' : 'Normal' },
      { label: 'Konum', value: data.city ?? regionName(data.region_id) ?? 'Genel' },
      { label: 'Görüntülenme', value: String(data.view_count ?? 0) },
      ...(data.is_featured ? [{ label: 'Öne çıkan', value: 'Evet' }] : []),
      { label: 'İlan', value: formatDate(data.created_at) ?? formatVoraNeedDate(data.created_at) },
    ],
  };
}
