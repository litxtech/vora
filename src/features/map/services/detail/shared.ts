import { regionNameById } from '@/constants/regions';
import type { MapDetailType } from '@/features/map/types';

export type MapDetailRecord = {
  type: MapDetailType;
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  coverUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt?: string;
  isDemo?: boolean;
  ownerId?: string;
  mediaUrls?: string[];
  eventMeta?: {
    ticketType: 'free' | 'paid';
    ticketPriceCents: number | null;
    qrToken: string | null;
    startsAt?: string;
    endsAt?: string | null;
    category?: string;
    mapCategory?: string;
    maxAttendees?: number | null;
    viewCount?: number;
  };
  lostMeta?: {
    itemType: 'lost' | 'found';
    category: string;
    status: 'open' | 'resolved';
    isUrgent: boolean;
    rewardAmount: string | null;
    contactInfo: string | null;
    district: string | null;
    viewCount: number;
    lastSeenAt: string | null;
  };
  fields: { label: string; value: string }[];
};

export function regionName(id: string | null | undefined): string | undefined {
  return regionNameById(id);
}

export function formatDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return new Date(value).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function severityLabel(value: string): string {
  const map: Record<string, string> = {
    low: 'Düşük',
    medium: 'Orta',
    high: 'Yüksek',
    critical: 'Kritik',
  };
  return map[value] ?? value;
}

export function statusLabelIncident(value: string): string {
  const map: Record<string, string> = {
    open: 'Açık',
    verified: 'Doğrulandı',
    resolved: 'Çözüldü',
    dismissed: 'Reddedildi',
  };
  return map[value] ?? value;
}
