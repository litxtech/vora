import type { ProviderPublicWork } from '@/features/vora-hizmetler/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

type PublicWorkRow = {
  work_id: string;
  work_source: string;
  title: string;
  description: string | null;
  before_image_url: string | null;
  after_image_url: string | null;
  media_urls: string[] | null;
  completed_at: string;
};

function mapPublicWorkRow(row: PublicWorkRow): ProviderPublicWork {
  return {
    id: row.work_id,
    source: row.work_source === 'completed_job' ? 'completed_job' : 'portfolio',
    title: row.title,
    description: row.description,
    beforeImageUrl: row.before_image_url,
    afterImageUrl: row.after_image_url,
    mediaUrls: row.media_urls ?? [],
    completedAt: row.completed_at,
  };
}

export async function fetchPublicProviderWorks(
  providerId: string,
  limit = 30,
): Promise<{ items: ProviderPublicWork[]; error?: string }> {
  const { data, error } = await supabase.rpc('fetch_public_vora_provider_works', {
    p_provider_id: providerId,
    p_limit: limit,
  });

  if (error) return { items: [], error: supabaseErrorMessage(error) };

  return {
    items: ((data as PublicWorkRow[] | null) ?? []).map(mapPublicWorkRow),
  };
}

export function publicWorkMediaUrls(item: ProviderPublicWork): string[] {
  return [item.afterImageUrl, item.beforeImageUrl, ...item.mediaUrls].filter(
    (url): url is string => Boolean(url),
  );
}

export function buildPublicWorkShareContent(item: ProviderPublicWork): string {
  const lines = [`✨ ${item.title}`];
  if (item.description?.trim()) {
    lines.push('', item.description.trim());
  }
  if (item.source === 'completed_job') {
    lines.push('', 'Vora Hizmetler üzerinden tamamlanan iş.');
  }
  lines.push('', '#VoraHizmetler');
  return lines.join('\n');
}
