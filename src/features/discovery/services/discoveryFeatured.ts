import { supabase } from '@/lib/supabase/client';
import type { DiscoveryTab } from '@/features/discovery/types';
import { supabaseErrorMessage } from '@/lib/errors';

export type DiscoveryFeaturedRow = {
  id: string;
  tab: DiscoveryTab;
  target_type: 'post' | 'reel' | 'business' | 'event' | 'job';
  target_id: string;
  target_label: string;
  region_id: string | null;
  scope: 'region' | 'karadeniz';
  priority: number;
  featured_until: string | null;
  featured_by_username: string | null;
  created_at: string;
};

export const DISCOVERY_TAB_OPTIONS: { id: DiscoveryTab; label: string; targetType: DiscoveryFeaturedRow['target_type'] }[] = [
  { id: 'posts', label: 'Gönderiler', targetType: 'post' },
  { id: 'news', label: 'Haberler', targetType: 'post' },
  { id: 'reels', label: 'Reels', targetType: 'reel' },
  { id: 'events', label: 'Etkinlikler', targetType: 'event' },
  { id: 'businesses', label: 'İşletmeler', targetType: 'business' },
  { id: 'jobs', label: 'İş İlanları', targetType: 'job' },
];

export const FEATURE_DURATION_OPTIONS = [
  { id: 'unlimited', label: 'Süresiz', days: null },
  { id: 'days_7', label: '7 Gün', days: 7 },
  { id: 'days_30', label: '30 Gün', days: 30 },
] as const;

export async function fetchActiveFeaturedIds(
  tab: DiscoveryTab,
  regionId: string,
  scope: 'region' | 'karadeniz',
): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc('get_active_discovery_featured', {
    p_tab: tab,
    p_region_id: regionId,
    p_scope: scope,
  });
  if (error || !data) return new Map();
  return new Map(
    (data as { target_id: string; priority: number }[]).map((row) => [row.target_id, row.priority]),
  );
}

export async function listDiscoveryFeatured(limit = 50): Promise<DiscoveryFeaturedRow[]> {
  const { data, error } = await supabase.rpc('admin_list_discovery_featured', { p_limit: limit });
  if (error || !data) return [];
  return data as DiscoveryFeaturedRow[];
}

export async function featureDiscoveryItem(params: {
  tab: DiscoveryTab;
  targetType: DiscoveryFeaturedRow['target_type'];
  targetId: string;
  regionId?: string;
  scope?: 'region' | 'karadeniz';
  priority?: number;
  days?: number | null;
}) {
  const { error } = await supabase.rpc('admin_feature_discovery_item', {
    p_tab: params.tab,
    p_target_type: params.targetType,
    p_target_id: params.targetId,
    p_region_id: params.regionId ?? null,
    p_scope: params.scope ?? 'region',
    p_priority: params.priority ?? 0,
    p_days: params.days ?? null,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function unfeatureDiscoveryItem(id: string) {
  const { error } = await supabase.rpc('admin_unfeature_discovery_item', { p_id: id });
  return { error: supabaseErrorMessage(error) };
}

export function formatFeaturedExpiry(featuredUntil: string | null): string {
  if (!featuredUntil) return 'Süresiz';
  const date = new Date(featuredUntil);
  if (date <= new Date()) return 'Süresi doldu';
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const FEATURED_SCORE_BOOST = 1_000_000;

export function featuredTrendBoost(
  targetId: string,
  baseScore: number,
  featured: Map<string, number>,
): number {
  const priority = featured.get(targetId);
  if (priority === undefined) return baseScore;
  return baseScore + FEATURED_SCORE_BOOST + priority;
}
