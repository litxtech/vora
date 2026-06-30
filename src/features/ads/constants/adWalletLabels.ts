import type { AdWalletEntryType, AdWalletLedgerEntry } from '@/features/ads/types';
import type { Ionicons } from '@expo/vector-icons';

export const AD_WALLET_ENTRY_LABELS: Record<
  AdWalletEntryType,
  { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  topup: {
    title: 'Yükleme',
    subtitle: 'Reklam cüzdanına bakiye eklendi',
    icon: 'add-circle-outline',
  },
  ad_click: {
    title: 'Reklam tıklaması için kullanıldı',
    subtitle: 'Kampanya tıklama ücreti',
    icon: 'megaphone-outline',
  },
  admin_adjustment: {
    title: 'Platform düzenlemesi',
    subtitle: 'Reklam cüzdanı bakiye güncellemesi',
    icon: 'build-outline',
  },
  refund: {
    title: 'İade',
    subtitle: 'Reklam cüzdanına iade yapıldı',
    icon: 'return-down-back-outline',
  },
};

export function describeAdWalletEntry(entry: AdWalletLedgerEntry): {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
} {
  const base = AD_WALLET_ENTRY_LABELS[entry.entryType] ?? AD_WALLET_ENTRY_LABELS.topup;

  if (entry.entryType === 'topup') {
    return base;
  }

  if (entry.entryType === 'ad_click') {
    return {
      ...base,
      subtitle: entry.adTitle ? `Kampanya: ${entry.adTitle}` : base.subtitle,
    };
  }

  if (entry.note?.trim()) {
    return {
      ...base,
      subtitle: entry.note.trim(),
    };
  }

  return base;
}

export function formatAdWalletLedgerAmount(cents: number): string {
  const abs = Math.abs(cents);
  const formatted = (abs / 100).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return cents >= 0 ? `+₺${formatted}` : `-₺${formatted}`;
}

export function formatAdWalletLedgerDate(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatAdWalletRelativeDate(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return 'Az önce';
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün önce`;
  return formatAdWalletLedgerDate(iso);
}
