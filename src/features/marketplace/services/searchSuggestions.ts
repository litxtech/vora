import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CATEGORY_DEFS,
  MARKETPLACE_POPULAR_SEARCHES,
  categoryLabel,
} from '@/features/marketplace/constants';
import { mpSupabase } from '@/features/marketplace/services/mpSupabase';
import type { MarketplaceCategory, MarketplaceFilters } from '@/features/marketplace/types';

const RECENT_KEY = 'marketplace_recent_searches_v1';
const RECENT_LIMIT = 8;

export type MarketplaceSearchSuggestionKind =
  | 'recent'
  | 'popular'
  | 'category'
  | 'subcategory'
  | 'listing';

export type MarketplaceSearchSuggestion = {
  id: string;
  label: string;
  subtitle?: string;
  kind: MarketplaceSearchSuggestionKind;
  searchQuery: string;
  category?: MarketplaceCategory;
  listingId?: string;
  imageUrl?: string | null;
};

export type MarketplaceSearchSelection = {
  query: string;
  filters: MarketplaceFilters;
  listingId?: string;
};

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('tr-TR');
}

function matchesQuery(label: string, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  return normalize(label).includes(q);
}

function staticCategorySuggestions(query: string): MarketplaceSearchSuggestion[] {
  const items: MarketplaceSearchSuggestion[] = [];
  const q = query.trim();

  for (const [categoryId, def] of Object.entries(CATEGORY_DEFS) as [
    MarketplaceCategory,
    (typeof CATEGORY_DEFS)[MarketplaceCategory],
  ][]) {
    if (matchesQuery(def.label, q)) {
      items.push({
        id: `cat-${categoryId}`,
        label: def.label,
        subtitle: 'Kategori',
        kind: 'category',
        searchQuery: '',
        category: categoryId,
      });
    }

    for (const sub of def.subcategories) {
      if (matchesQuery(sub.label, q) || matchesQuery(`${def.label} ${sub.label}`, q)) {
        items.push({
          id: `sub-${categoryId}-${sub.slug}`,
          label: sub.label,
          subtitle: def.label,
          kind: 'subcategory',
          searchQuery: sub.label,
          category: categoryId,
        });
      }
    }
  }

  return items.slice(0, 6);
}

export async function loadRecentMarketplaceSearches(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, RECENT_LIMIT) : [];
  } catch {
    return [];
  }
}

export async function saveRecentMarketplaceSearch(query: string): Promise<void> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return;
  const recent = await loadRecentMarketplaceSearches();
  const next = [trimmed, ...recent.filter((item) => normalize(item) !== normalize(trimmed))].slice(
    0,
    RECENT_LIMIT,
  );
  await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export async function clearRecentMarketplaceSearches(): Promise<void> {
  await AsyncStorage.removeItem(RECENT_KEY);
}

async function fetchListingSuggestions(
  regionId: string,
  query: string,
): Promise<MarketplaceSearchSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const { data } = await mpSupabase
    .from('marketplace_listings')
    .select('id, title, category, cover_url, media_urls, district')
    .eq('region_id', regionId)
    .eq('content_status', 'published')
    .eq('status', 'active')
    .ilike('title', `%${q}%`)
    .order('favorite_count', { ascending: false })
    .limit(6);

  return (
    (data ?? []) as {
      id: string;
      title: string;
      category: string;
      cover_url: string | null;
      media_urls: string[] | null;
      district: string;
    }[]
  ).map((row) => ({
    id: `listing-${row.id}`,
    label: row.title,
    subtitle: `${categoryLabel(row.category)} · ${row.district}`,
    kind: 'listing' as const,
    searchQuery: row.title,
    listingId: row.id,
    category: row.category as MarketplaceCategory,
    imageUrl: row.cover_url ?? row.media_urls?.[0] ?? null,
  }));
}

export async function fetchMarketplaceSearchSuggestions(
  regionId: string,
  query: string,
): Promise<MarketplaceSearchSuggestion[]> {
  const trimmed = query.trim();
  const recent = await loadRecentMarketplaceSearches();

  if (!trimmed) {
    const recentItems: MarketplaceSearchSuggestion[] = recent.map((item) => ({
      id: `recent-${item}`,
      label: item,
      subtitle: 'Son arama',
      kind: 'recent',
      searchQuery: item,
    }));

    const popularItems: MarketplaceSearchSuggestion[] = MARKETPLACE_POPULAR_SEARCHES.filter(
      (item) => !recent.some((r) => normalize(r) === normalize(item)),
    ).map((item) => ({
      id: `popular-${item}`,
      label: item,
      subtitle: 'Popüler arama',
      kind: 'popular',
      searchQuery: item,
    }));

    return [...recentItems, ...popularItems].slice(0, 12);
  }

  const staticItems = staticCategorySuggestions(trimmed);
  const listingItems = await fetchListingSuggestions(regionId, trimmed);

  const seen = new Set<string>();
  const merged: MarketplaceSearchSuggestion[] = [];

  for (const item of [...staticItems, ...listingItems]) {
    const key = `${item.kind}:${normalize(item.label)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged.slice(0, 10);
}

export function suggestionToSelection(
  suggestion: MarketplaceSearchSuggestion,
  baseFilters: MarketplaceFilters,
): MarketplaceSearchSelection {
  if (suggestion.kind === 'listing' && suggestion.listingId) {
    return {
      query: suggestion.searchQuery,
      filters: baseFilters,
      listingId: suggestion.listingId,
    };
  }

  if (suggestion.kind === 'category' && suggestion.category) {
    return {
      query: '',
      filters: { ...baseFilters, category: suggestion.category, subcategory: null },
    };
  }

  if (suggestion.kind === 'subcategory' && suggestion.category) {
    return {
      query: suggestion.searchQuery,
      filters: { ...baseFilters, category: suggestion.category },
    };
  }

  return {
    query: suggestion.searchQuery,
    filters: baseFilters,
  };
}
