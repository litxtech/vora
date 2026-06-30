import type { UserRole } from '@/types/database';

export type BroadcastAudienceSegment =
  | 'all'
  | 'all_registered'
  | 'outdated_app'
  | 'banned'
  | 'quarantined'
  | 'premium'
  | 'deletion_pending';

export type BroadcastAudienceFilter = {
  segment: BroadcastAudienceSegment;
  regionId?: string | null;
  role?: UserRole | null;
  requirePushToken?: boolean;
};

export const BROADCAST_AUDIENCE_LABELS: Record<BroadcastAudienceSegment, string> = {
  all: 'Tüm aktif kullanıcılar',
  all_registered: 'Tüm kayıtlı kullanıcılar',
  outdated_app: 'Güncellemeyenler',
  banned: 'Yasaklı / dondurulmuş',
  quarantined: 'Karantinada',
  premium: 'Premium üyeler',
  deletion_pending: 'Silme bekleyenler',
};

export const BROADCAST_AUDIENCE_HINTS: Partial<Record<BroadcastAudienceSegment, string>> = {
  outdated_app: 'Minimum sürümün altında uygulama kullanan ve push token kayıtlı hesaplar.',
  banned: 'Dondurulmuş veya aktif yasak kaydı olan hesaplar.',
  quarantined: 'Karantina durumundaki hesaplar — moderasyon bildirimleri için.',
  all_registered: 'Silinmiş hesaplar hariç tüm kullanıcılar.',
};

export const BROADCAST_AUDIENCE_OPTIONS = (
  Object.keys(BROADCAST_AUDIENCE_LABELS) as BroadcastAudienceSegment[]
).map((id) => ({
  id,
  label: BROADCAST_AUDIENCE_LABELS[id],
}));

export function toBroadcastAudiencePayload(filter: BroadcastAudienceFilter): Record<string, unknown> {
  return {
    segment: filter.segment,
    region_id: filter.regionId ?? null,
    role: filter.role ?? null,
    require_push_token: filter.requirePushToken ?? false,
  };
}

export function audienceSegmentLabel(segment: string | null | undefined): string {
  if (!segment) return BROADCAST_AUDIENCE_LABELS.all;
  return BROADCAST_AUDIENCE_LABELS[segment as BroadcastAudienceSegment] ?? segment;
}
