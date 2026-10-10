import {
  PREMIUM_PACKAGE_LABELS,
  PROVIDER_LABELS,
  SHOP_BOOST_PACKAGE_LABELS,
  SHOP_SCOPE_LABELS,
  SUPPORT_PACKAGE_LABELS,
} from '@/features/purchase-history/constants';
import type {
  DisputeStatus,
  PackagePurchase,
  PurchaseDispute,
  PurchaseSource,
  PurchaseUsage,
} from '@/features/purchase-history/types';
import { formatTryCents } from '@/features/purchase-history/utils';
import { supabaseErrorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';

const SOURCES: PurchaseSource[] = ['premium', 'platform_support', 'shop_boost'];
const USAGES: PurchaseUsage[] = ['using', 'used', 'unused'];
const DISPUTE_STATUSES: DisputeStatus[] = ['open', 'reviewing', 'accepted', 'rejected'];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function packageTitle(source: PurchaseSource, packageKey: string): string {
  if (source === 'premium') return PREMIUM_PACKAGE_LABELS[packageKey] ?? 'Vora Premium';
  if (source === 'platform_support') return SUPPORT_PACKAGE_LABELS[packageKey] ?? 'Platform desteği';
  return SHOP_BOOST_PACKAGE_LABELS[packageKey] ?? 'Mağaza vitrini';
}

function packageDetail(row: Record<string, unknown>, source: PurchaseSource): string | null {
  const amount = typeof row.amount_cents === 'number' ? row.amount_cents : null;
  const meta = asString(row.meta);
  const days = typeof row.duration_days === 'number' ? row.duration_days : null;

  if (source === 'premium') {
    return meta ? (PROVIDER_LABELS[meta] ?? meta) : null;
  }

  if (source === 'platform_support') {
    return amount != null ? formatTryCents(amount) : null;
  }

  const scope = meta ? (SHOP_SCOPE_LABELS[meta] ?? meta) : null;
  const parts = [scope, days != null ? `${days} gün` : null, amount != null ? formatTryCents(amount) : null];
  const detail = parts.filter(Boolean).join(' · ');
  return detail || null;
}

function mapDispute(row: Record<string, unknown>): PurchaseDispute | null {
  const id = asString(row.dispute_id);
  const status = asString(row.dispute_status);
  const reason = asString(row.dispute_reason);
  const createdAt = asString(row.dispute_created_at);
  if (!id || !status || !reason || !createdAt) return null;
  if (!DISPUTE_STATUSES.includes(status as DisputeStatus)) return null;
  return { id, status: status as DisputeStatus, reason, createdAt };
}

function mapPurchase(value: unknown): PackagePurchase | null {
  const row = asRecord(value);
  if (!row) return null;
  const source = asString(row.source);
  const sourceId = asString(row.source_id);
  const purchasedAt = asString(row.purchased_at);
  const usage = asString(row.usage);
  const packageKey = asString(row.package_key) ?? '';
  if (!source || !SOURCES.includes(source as PurchaseSource) || !sourceId || !purchasedAt) return null;
  if (!usage || !USAGES.includes(usage as PurchaseUsage)) return null;

  const dispute = mapDispute(row);
  const fulfillmentProblem = row.fulfillment_problem === true;

  return {
    id: `${source}:${sourceId}`,
    source: source as PurchaseSource,
    sourceId,
    title: packageTitle(source as PurchaseSource, packageKey),
    detail: packageDetail(row, source as PurchaseSource),
    purchasedAt,
    usage: usage as PurchaseUsage,
    hadProblem: fulfillmentProblem || dispute != null,
    dispute,
  };
}

function parseList(data: unknown): PackagePurchase[] {
  const rows = Array.isArray(data) ? data : [];
  return rows.map(mapPurchase).filter((item): item is PackagePurchase => item != null);
}

export async function fetchMyPackagePurchases(): Promise<{
  items: PackagePurchase[];
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('list_my_package_purchases');
  if (error) {
    return {
      items: [],
      error: supabaseErrorMessage(error, 'Satın alma geçmişi yüklenemedi.') ?? 'Satın alma geçmişi yüklenemedi.',
    };
  }
  return { items: parseList(data), error: null };
}

export async function submitPackageDispute(
  source: PurchaseSource,
  sourceId: string,
  reason: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('submit_package_purchase_dispute', {
    p_source: source,
    p_source_id: sourceId,
    p_reason: reason.trim(),
  });
  if (error) {
    return {
      error: supabaseErrorMessage(error, 'İtiraz gönderilemedi.') ?? 'İtiraz gönderilemedi.',
    };
  }
  return { error: null };
}
