import {
  AD_WALLET_ENTRY_LABELS,
  describeAdWalletEntry,
  formatAdWalletLedgerAmount,
} from '@/features/ads/constants/adWalletLabels';
import { formatWalletBalance } from '@/features/ads/services/adBilling';
import type { AdWalletLedgerEntry } from '@/features/ads/types';
import { formatCents } from '@/features/marketplace/constants';
import { HOTEL_RESERVATION_STATUS_LABELS } from '@/features/hotel-center/constants';
import { hotelEarningPayoutLabel } from '@/features/hotel-center/services/ownerEarnings';
import type { HotelOwnerEarningRow } from '@/features/hotel-center/types';
import { formatCents as formatRideCents, PAYMENT_STATUS_LABELS } from '@/features/rides/constants';
import { JETON_SYMBOL, PUAN_LABEL, TRUST_SOURCE_LABELS } from '@/features/wallet/constants';
import type { DriverEarningRow } from '@/features/rides/services/earningsData';
import type { SellerSaleRecord } from '@/features/marketplace/types';
import type {
  JetonSourceType,
  JetonTransaction,
  JetonTransactionType,
  TrustLedgerEntry,
  WalletActivityDetailField,
  WalletActivitySector,
  WalletActivityStatus,
} from '@/features/wallet/types';

export const JETON_TX_TYPE_LABELS: Record<JetonTransactionType, string> = {
  task_reward: 'Görev ödülü',
  admin_credit: 'Admin yüklemesi',
  admin_debit: 'Admin kesintisi',
  spend: 'Harcama',
  bonus: 'Bonus',
  transfer_in: 'Gelen transfer',
  transfer_out: 'Giden transfer',
};

export const JETON_SOURCE_LABELS: Record<JetonSourceType, string> = {
  daily_task: 'Günlük görev',
  admin: 'Platform düzenlemesi',
  profile_boost: 'Profil öne çıkarma',
  deal_redeem: 'Fırsat kullanımı',
  tip: 'Bahşiş',
  signup_bonus: 'Kayıt bonusu',
  other: 'Diğer',
};

export function describeJetonTransaction(tx: JetonTransaction): { title: string; subtitle: string } {
  const typeLabel = JETON_TX_TYPE_LABELS[tx.txType] ?? 'Jeton hareketi';
  const sourceLabel = JETON_SOURCE_LABELS[tx.sourceType];
  const title = tx.note?.trim() || typeLabel;
  const parts = [typeLabel];
  if (sourceLabel && tx.sourceType !== 'other') {
    parts.push(sourceLabel);
  }
  parts.push(`Bakiye ${tx.balanceAfter.toLocaleString('tr-TR')} ${JETON_SYMBOL}`);
  return { title, subtitle: parts.join(' · ') };
}

export const WALLET_SECTOR_META: Record<
  WalletActivitySector,
  {
    label: string;
    accent: string;
    icon: 'shield-checkmark' | 'storefront' | 'car' | 'bed' | 'megaphone' | 'construct';
  }
> = {
  points: { label: PUAN_LABEL, accent: '#FBBF24', icon: 'shield-checkmark' },
  marketplace: { label: 'Yerel Pazar', accent: '#FF9800', icon: 'storefront' },
  rides: { label: 'Yolculuk', accent: '#2196F3', icon: 'car' },
  hotel: { label: 'Otel', accent: '#00897B', icon: 'bed' },
  ads: { label: 'Reklam', accent: '#7C3AED', icon: 'megaphone' },
  hizmetler: { label: 'Vora Hizmetler', accent: '#0EA5E9', icon: 'construct' },
};

export const WALLET_ACTIVITY_STATUS_LABELS: Record<WalletActivityStatus, string> = {
  completed: 'Yatırıldı',
  pending: 'Bekliyor',
  scheduled: 'Planlandı',
};

export function formatActivityFullDate(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function trustLedgerActivityDetails(entry: TrustLedgerEntry): WalletActivityDetailField[] {
  const { title, reason } = describeTrustLedgerEntry(entry);
  return [
    { label: 'Açıklama', value: title, emphasize: true },
    { label: 'Neden', value: reason, emphasize: true },
    { label: 'Kaynak türü', value: TRUST_SOURCE_LABELS[entry.sourceType] ?? entry.sourceType },
    {
      label: 'Değişim',
      value: `${entry.appliedDelta >= 0 ? '+' : ''}${entry.appliedDelta} puan`,
      emphasize: true,
    },
    { label: 'Önceki puan', value: `${entry.scoreBefore} puan` },
    { label: 'Yeni puan', value: `${entry.scoreAfter} puan`, emphasize: true },
    { label: 'Referans', value: entry.sourceId ?? '—' },
    { label: 'Not', value: entry.note?.trim() || '—' },
    { label: 'İşlem no', value: entry.id },
    { label: 'Tarih', value: formatActivityFullDate(entry.createdAt) },
  ];
}

export function describeTrustLedgerEntry(entry: TrustLedgerEntry): {
  title: string;
  subtitle: string;
  reason: string;
} {
  const sourceLabel = TRUST_SOURCE_LABELS[entry.sourceType] ?? 'Güven puanı hareketi';
  const isAdmin = entry.sourceType === 'admin_adjust';
  const title = isAdmin ? 'Platform düzenlemesi yapıldı' : entry.note?.trim() || sourceLabel;
  const reason = entry.note?.trim() || sourceLabel;
  const direction = entry.appliedDelta >= 0 ? 'Kazanım' : 'Düşüş';

  return {
    title,
    reason,
    subtitle: isAdmin
      ? `${entry.scoreBefore} → ${entry.scoreAfter} puan · ${reason}`
      : `${direction} · ${sourceLabel} · Bakiye ${entry.scoreAfter} puan`,
  };
}

export function marketplaceActivityDetails(sale: SellerSaleRecord): WalletActivityDetailField[] {
  const copy = marketplaceActivityFromSale(sale);
  return [
    { label: 'İlan', value: sale.listingTitle, emphasize: true },
    { label: 'Sektör', value: 'Yerel Pazar' },
    { label: 'Satış türü', value: sale.source === 'manual' ? 'Manuel satış' : 'Platform satışı' },
    { label: 'Sipariş no', value: sale.orderNumber ?? '—' },
    { label: 'Alıcı', value: sale.buyerName ?? '—' },
    { label: 'Brüt tutar', value: formatCents(sale.grossAmountCents, sale.currency) },
    { label: 'Platform komisyonu', value: formatCents(sale.commissionCents, sale.currency) },
    { label: 'Net kazanç', value: formatCents(sale.sellerNetCents, sale.currency), emphasize: true },
    { label: 'Durum', value: sale.statusLabel },
    { label: 'Ödeme durumu', value: WALLET_ACTIVITY_STATUS_LABELS[copy.status] },
    { label: 'Satış tarihi', value: formatActivityFullDate(sale.soldAt) },
    {
      label: 'Ödeme planı',
      value: sale.payoutDueAt ? formatActivityFullDate(sale.payoutDueAt) : '—',
    },
    {
      label: 'Hesaba yatırılma',
      value: sale.payoutCompletedAt ? formatActivityFullDate(sale.payoutCompletedAt) : 'Henüz yatırılmadı',
    },
    { label: 'Kayıt no', value: sale.orderId ?? sale.listingId },
  ];
}

export function ridesActivityDetails(row: DriverEarningRow): WalletActivityDetailField[] {
  const copy = ridesActivityFromRow(row);
  return [
    { label: 'Güzergah', value: row.routeLabel, emphasize: true },
    { label: 'Sektör', value: 'Paylaşımlı Yolculuk' },
    { label: 'Koltuk sayısı', value: String(row.seatCount) },
    { label: 'Brüt tutar', value: formatRideCents(row.grossCents) },
    { label: 'Platform komisyonu', value: formatRideCents(row.commissionCents) },
    { label: 'Sürücü net kazancı', value: formatRideCents(row.driverPayoutCents), emphasize: true },
    { label: 'Ödeme durumu', value: PAYMENT_STATUS_LABELS[row.paymentStatus] ?? row.paymentStatus },
    { label: 'Transfer durumu', value: WALLET_ACTIVITY_STATUS_LABELS[copy.status] },
    {
      label: 'Yolculuk tamamlanma',
      value: row.completedAt ? formatActivityFullDate(row.completedAt) : '—',
    },
    {
      label: 'Ödeme planı',
      value: row.payoutDueAt ? formatActivityFullDate(row.payoutDueAt) : '—',
    },
    {
      label: 'Hesaba yatırılma',
      value: row.payoutCompletedAt ? formatActivityFullDate(row.payoutCompletedAt) : 'Henüz yatırılmadı',
    },
    { label: 'Rezervasyon no', value: row.reservationId },
    { label: 'Yolculuk no', value: row.tripId },
  ];
}

export function hotelActivityDetails(row: HotelOwnerEarningRow): WalletActivityDetailField[] {
  const checkIn = new Date(row.checkIn).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const checkOut = new Date(row.checkOut).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const copy = hotelActivityFromRow(row);

  return [
    { label: 'Otel', value: row.hotelName, emphasize: true },
    { label: 'Sektör', value: 'Otel Merkezi' },
    { label: 'Rezervasyon kodu', value: row.reservationCode },
    { label: 'Giriş', value: checkIn },
    { label: 'Çıkış', value: checkOut },
    { label: 'Gece sayısı', value: String(row.nights) },
    { label: 'Brüt tutar', value: formatCents(row.grossCents) },
    { label: 'Platform komisyonu', value: formatCents(row.commissionCents) },
    { label: 'İşletme net kazancı', value: formatCents(row.ownerPayoutCents), emphasize: true },
    { label: 'Rezervasyon durumu', value: HOTEL_RESERVATION_STATUS_LABELS[row.status] },
    { label: 'Ödeme durumu', value: hotelEarningPayoutLabel(row) },
    { label: 'Transfer durumu', value: WALLET_ACTIVITY_STATUS_LABELS[copy.status] },
    {
      label: 'Konaklama tamamlanma',
      value: row.completedAt ? formatActivityFullDate(row.completedAt) : '—',
    },
    {
      label: 'Ödeme planı',
      value: row.payoutDueAt ? formatActivityFullDate(row.payoutDueAt) : '—',
    },
    {
      label: 'Hesaba yatırılma',
      value: row.payoutCompletedAt ? formatActivityFullDate(row.payoutCompletedAt) : 'Henüz yatırılmadı',
    },
    {
      label: 'Ödeme alınma',
      value: row.paidAt ? formatActivityFullDate(row.paidAt) : '—',
    },
    { label: 'Rezervasyon no', value: row.reservationId },
  ];
}

export function formatActivityAmount(item: {
  currency: 'try' | 'points';
  amountCents?: number;
  pointsAmount?: number;
}): string {
  if (item.currency === 'try' && item.amountCents != null) {
    const prefix = item.amountCents >= 0 ? '+' : '';
    return `${prefix}${formatCents(item.amountCents)}`;
  }
  if (item.pointsAmount != null) {
    const prefix = item.pointsAmount >= 0 ? '+' : '';
    return `${prefix}${item.pointsAmount.toLocaleString('tr-TR')} puan`;
  }
  return '—';
}

export function marketplaceActivityFromSale(sale: SellerSaleRecord): {
  status: WalletActivityStatus;
  title: string;
  subtitle: string;
  occurredAt: string;
} {
  const paidOut = !!sale.payoutCompletedAt || sale.source === 'manual';
  const status: WalletActivityStatus = paidOut
    ? 'completed'
    : sale.payoutDueAt
      ? 'scheduled'
      : 'pending';

  const title = sale.listingTitle ? `Satış · ${sale.listingTitle}` : 'Yerel Pazar satışı';
  const detailParts = [
    sale.buyerName ? `Alıcı: ${sale.buyerName}` : null,
    sale.orderNumber ? `#${sale.orderNumber}` : sale.source === 'manual' ? 'Manuel satış' : null,
    paidOut ? 'Hesaba yatırıldı' : status === 'scheduled' ? 'Ödeme planlandı' : 'Ödeme bekleniyor',
  ].filter(Boolean);

  return {
    status,
    title,
    subtitle: detailParts.join(' · '),
    occurredAt: sale.payoutCompletedAt ?? sale.soldAt,
  };
}

export function ridesActivityFromRow(row: DriverEarningRow): {
  status: WalletActivityStatus;
  title: string;
  subtitle: string;
  occurredAt: string;
} {
  const status: WalletActivityStatus = row.payoutCompletedAt
    ? 'completed'
    : row.paymentStatus === 'released'
      ? 'scheduled'
      : 'pending';

  const statusText =
    status === 'completed'
      ? 'Hesaba yatırıldı'
      : status === 'scheduled'
        ? 'Ödeme planlandı'
        : 'Escrow bekleniyor';

  return {
    status,
    title: 'Sürücü kazancı',
    subtitle: `${row.routeLabel} · ${row.seatCount} koltuk · ${statusText}`,
    occurredAt: row.payoutCompletedAt ?? row.completedAt ?? new Date().toISOString(),
  };
}

export function hotelActivityFromRow(row: HotelOwnerEarningRow): {
  status: WalletActivityStatus;
  title: string;
  subtitle: string;
  occurredAt: string;
} {
  const status: WalletActivityStatus = row.payoutCompletedAt
    ? 'completed'
    : row.status === 'completed'
      ? 'scheduled'
      : 'pending';

  const checkIn = new Date(row.checkIn).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  const checkOut = new Date(row.checkOut).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

  return {
    status,
    title: `Rezervasyon · ${row.hotelName}`,
    subtitle: `${checkIn} – ${checkOut} · ${row.reservationCode} · ${hotelEarningPayoutLabel(row)}`,
    occurredAt: row.payoutCompletedAt ?? row.completedAt ?? row.paidAt ?? row.checkIn,
  };
}

export function adWalletActivityFromEntry(entry: AdWalletLedgerEntry): {
  status: WalletActivityStatus;
  title: string;
  subtitle: string;
} {
  const copy = describeAdWalletEntry(entry);
  return {
    status: 'completed',
    title: copy.title,
    subtitle: copy.subtitle,
  };
}

export function adWalletActivityDetails(entry: AdWalletLedgerEntry): WalletActivityDetailField[] {
  const copy = describeAdWalletEntry(entry);
  const typeLabel = AD_WALLET_ENTRY_LABELS[entry.entryType]?.title ?? entry.entryType;

  return [
    { label: 'Açıklama', value: copy.title, emphasize: true },
    { label: 'Detay', value: copy.subtitle, emphasize: true },
    { label: 'Sektör', value: 'Reklam' },
    { label: 'İşlem türü', value: typeLabel },
    ...(entry.adTitle ? [{ label: 'Kampanya', value: entry.adTitle, emphasize: true }] : []),
    {
      label: 'Tutar',
      value: formatAdWalletLedgerAmount(entry.amountCents),
      emphasize: true,
    },
    {
      label: 'Reklam cüzdanı bakiyesi',
      value: formatWalletBalance(entry.balanceAfterCents),
      emphasize: true,
    },
    { label: 'Not', value: entry.note?.trim() || '—' },
    { label: 'İşlem no', value: entry.id },
    { label: 'Tarih', value: formatActivityFullDate(entry.createdAt) },
  ];
}

export function hizmetActivityFromRow(row: {
  requestTitle: string | null;
  amount: number;
  method: string;
  status: string;
  direction: 'out' | 'in';
  payoutDueAt?: string | null;
  payoutCompletedAt?: string | null;
}): { title: string; subtitle: string; status: WalletActivityStatus } {
  const isOut = row.direction === 'out';
  const title = isOut ? 'Hizmet ödemesi' : 'Hizmet kazancı';
  let subtitle = row.requestTitle ?? 'Vora Hizmetler';
  if (row.payoutCompletedAt) {
    subtitle += ' · yatırıldı';
  } else if (row.payoutDueAt && row.direction === 'in') {
    subtitle += ' · 7 gün içinde';
  } else if (row.status === 'authorized' && isOut) {
    subtitle += ' · Vora güvencesinde';
  }
  const walletStatus =
    row.status === 'completed' || row.payoutCompletedAt
      ? 'completed'
      : row.status === 'authorized' && row.payoutDueAt
        ? 'scheduled'
        : row.status === 'authorized' || row.status === 'pending'
          ? 'pending'
          : 'pending';
  return { title, subtitle, status: walletStatus };
}

export function hizmetActivityDetails(row: {
  id: string;
  requestTitle: string | null;
  amount: number;
  method: string;
  status: string;
  direction: 'out' | 'in';
  createdAt: string;
}): WalletActivityDetailField[] {
  const copy = hizmetActivityFromRow(row);
  const methodLabel =
    row.method === 'stripe'
      ? 'Stripe'
      : row.method === 'cash'
        ? 'Nakit'
        : row.method === 'card'
          ? 'Kart'
          : 'Havale';
  return [
    { label: 'Açıklama', value: copy.title, emphasize: true },
    { label: 'Talep', value: copy.subtitle, emphasize: true },
    { label: 'Sektör', value: 'Vora Hizmetler' },
    { label: 'Yöntem', value: methodLabel },
    {
      label: 'Tutar',
      value: `${row.direction === 'out' ? '-' : '+'}${row.amount.toLocaleString('tr-TR')} ₺`,
      emphasize: true,
    },
    { label: 'Durum', value: WALLET_ACTIVITY_STATUS_LABELS[copy.status] },
    { label: 'İşlem no', value: row.id },
    { label: 'Tarih', value: formatActivityFullDate(row.createdAt) },
  ];
}

export function activityDateGroupLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - day.getTime()) / 86_400_000);

  if (diffDays === 0) return 'Bugün';
  if (diffDays === 1) return 'Dün';
  if (diffDays < 7) {
    return date.toLocaleDateString('tr-TR', { weekday: 'long' });
  }
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}
