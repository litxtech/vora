import type {
  BusinessShopHotel,
  BusinessShopProduct,
  BusinessShopShowcaseItem,
  BusinessShopShowcaseKind,
} from '@/features/business-center/types';
import { notifyMapMarkerRemovedBySource } from '@/features/map/services/mapMarkerSync';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

type ShowcaseRow = {
  id: string;
  business_id: string;
  item_kind: string;
  item_id: string;
  sort_order: number;
  is_visible: boolean;
};

function mapShowcaseRow(row: ShowcaseRow): BusinessShopShowcaseItem {
  return {
    id: row.id,
    businessId: row.business_id,
    itemKind: row.item_kind as BusinessShopShowcaseKind,
    itemId: row.item_id,
    sortOrder: row.sort_order,
    isVisible: row.is_visible,
  };
}

export async function fetchBusinessShopShowcase(
  businessId: string,
  options: { includeHidden?: boolean } = {},
): Promise<BusinessShopShowcaseItem[]> {
  let query = supabase
    .from('business_shop_showcase')
    .select('id, business_id, item_kind, item_id, sort_order, is_visible')
    .eq('business_id', businessId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (!options.includeHidden) {
    query = query.eq('is_visible', true);
  }

  const { data, error } = await query;
  if (error || !data?.length) return [];
  return data.map((row) => mapShowcaseRow(row as ShowcaseRow));
}

export function applyShowcaseOrdering<T extends { id: string }>(
  items: T[],
  showcase: BusinessShopShowcaseItem[],
  kind: BusinessShopShowcaseKind,
  options: { visibleOnly?: boolean } = {},
): T[] {
  const visibleOnly = options.visibleOnly ?? true;
  const kindShowcase = showcase.filter((row) => row.itemKind === kind);

  if (!kindShowcase.length) return items;

  const entries = kindShowcase
    .filter((row) => (visibleOnly ? row.isVisible : true))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered: T[] = [];

  for (const entry of entries) {
    const item = byId.get(entry.itemId);
    if (!item) continue;
    ordered.push(item);
  }

  if (visibleOnly) return ordered;

  const used = new Set(ordered.map((item) => item.id));
  for (const item of items) {
    if (!used.has(item.id)) ordered.push(item);
  }

  return ordered;
}

export async function ensureBusinessShopShowcaseSynced(
  businessId: string,
  products: BusinessShopProduct[],
  hotels: BusinessShopHotel[],
): Promise<BusinessShopShowcaseItem[]> {
  const existing = await fetchBusinessShopShowcase(businessId, { includeHidden: true });
  const existingKeys = new Set(existing.map((row) => `${row.itemKind}:${row.itemId}`));
  const next = [...existing];
  let sortOrder = existing.reduce((max, row) => Math.max(max, row.sortOrder), -1);

  for (const product of products) {
    const key = `product:${product.id}`;
    if (existingKeys.has(key)) continue;
    sortOrder += 1;
    next.push({
      id: '',
      businessId,
      itemKind: 'product',
      itemId: product.id,
      sortOrder,
      isVisible: true,
    });
    existingKeys.add(key);
  }

  for (const hotel of hotels) {
    const key = `hotel:${hotel.id}`;
    if (existingKeys.has(key)) continue;
    sortOrder += 1;
    next.push({
      id: '',
      businessId,
      itemKind: 'hotel',
      itemId: hotel.id,
      sortOrder,
      isVisible: true,
    });
    existingKeys.add(key);
  }

  if (next.length === existing.length) return existing;

  const { error } = await saveBusinessShopShowcase(businessId, next);
  if (error) return existing;
  return fetchBusinessShopShowcase(businessId, { includeHidden: true });
}

export async function saveBusinessShopShowcase(
  businessId: string,
  items: Pick<BusinessShopShowcaseItem, 'itemKind' | 'itemId' | 'sortOrder' | 'isVisible'>[],
): Promise<{ error: string | null }> {
  const payload = items.map((item) => ({
    business_id: businessId,
    item_kind: item.itemKind,
    item_id: item.itemId,
    sort_order: item.sortOrder,
    is_visible: item.isVisible,
    updated_at: new Date().toISOString(),
  }));

  const { error: deleteError } = await supabase
    .from('business_shop_showcase')
    .delete()
    .eq('business_id', businessId);

  if (deleteError) return { error: supabaseErrorMessage(deleteError) };
  if (!payload.length) return { error: null };

  const { error: insertError } = await supabase.from('business_shop_showcase').insert(payload);
  if (insertError) return { error: supabaseErrorMessage(insertError) };
  return { error: null };
}

/** Yeni ürün/otel vitrine ekler (mevcut sıranın sonuna). */
export async function appendBusinessShopShowcaseItem(
  businessId: string,
  kind: BusinessShopShowcaseKind,
  itemId: string,
): Promise<{ error: string | null }> {
  const existing = await fetchBusinessShopShowcase(businessId, { includeHidden: true });
  const key = `${kind}:${itemId}`;
  if (existing.some((row) => `${row.itemKind}:${row.itemId}` === key)) {
    return { error: null };
  }

  const sortOrder = existing.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;
  const { error } = await supabase.from('business_shop_showcase').insert({
    business_id: businessId,
    item_kind: kind,
    item_id: itemId,
    sort_order: sortOrder,
    is_visible: true,
  });

  return { error: supabaseErrorMessage(error) };
}

export type BusinessShopCurateRow = {
  key: string;
  itemKind: BusinessShopShowcaseKind;
  itemId: string;
  title: string;
  subtitle: string;
  coverUrl: string | null;
  sortOrder: number;
  isVisible: boolean;
};

export function buildBusinessShopCurateRows(
  products: BusinessShopProduct[],
  hotels: BusinessShopHotel[],
  showcase: BusinessShopShowcaseItem[],
): BusinessShopCurateRow[] {
  const showcaseMap = new Map(showcase.map((row) => [`${row.itemKind}:${row.itemId}`, row]));
  const rows: BusinessShopCurateRow[] = [];

  for (const product of products) {
    const key = `product:${product.id}`;
    const entry = showcaseMap.get(key);
    rows.push({
      key,
      itemKind: 'product',
      itemId: product.id,
      title: product.title,
      subtitle: 'Ürün',
      coverUrl: product.coverUrl ?? product.mediaUrls[0] ?? null,
      sortOrder: entry?.sortOrder ?? rows.length,
      isVisible: entry?.isVisible ?? true,
    });
  }

  for (const hotel of hotels) {
    const key = `hotel:${hotel.id}`;
    const entry = showcaseMap.get(key);
    rows.push({
      key,
      itemKind: 'hotel',
      itemId: hotel.id,
      title: hotel.name,
      subtitle: 'Otel',
      coverUrl: hotel.coverUrl,
      sortOrder: entry?.sortOrder ?? rows.length,
      isVisible: entry?.isVisible ?? true,
    });
  }

  return rows.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function curateRowsToShowcaseItems(
  businessId: string,
  rows: BusinessShopCurateRow[],
): BusinessShopShowcaseItem[] {
  return rows.map((row, index) => ({
    id: '',
    businessId,
    itemKind: row.itemKind,
    itemId: row.itemId,
    sortOrder: index,
    isVisible: row.isVisible,
  }));
}

/** Mağazadan ürün veya oteli kaldırır; ilgili vitrin kaydını da siler. */
export async function removeBusinessShopItem(
  businessId: string,
  kind: BusinessShopShowcaseKind,
  itemId: string,
  _ownerId: string,
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.rpc('business_shop_remove_item' as never, {
    p_business_id: businessId,
    p_item_kind: kind,
    p_item_id: itemId,
  } as never);

  if (error) return { error: supabaseErrorMessage(error) };

  const result = data as { error?: string } | null;
  const resolvedError = result?.error ?? null;
  if (!resolvedError) {
    notifyMapMarkerRemovedBySource(kind === 'product' ? 'marketplace' : 'hotels', itemId);
  }
  return { error: resolvedError };
}
