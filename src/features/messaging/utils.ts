import {
  sanitizeAvatarUrl,
  sanitizeDisplayName,
} from '@/features/account-deletion/utils';
import type { LocationGeocodedAddress } from 'expo-location';
import type {
  ChatActivity,
  ChatLocationPayload,
  ConversationDetail,
  ConversationListItem,
  MessagingParticipant,
} from './types';

export function displayParticipantName(participant?: MessagingParticipant | null): string {
  if (!participant) return 'Sohbet';
  return sanitizeDisplayName(participant.full_name, participant.username, participant.account_status);
}

export function participantAvatarUrl(participant?: MessagingParticipant | null): string | null {
  if (!participant) return null;
  return sanitizeAvatarUrl(participant.avatar_url, participant.account_status);
}

export function conversationTitle(item: ConversationListItem): string {
  if (item.type === 'group') return item.title?.trim() || 'Grup Sohbeti';
  return displayParticipantName(item.otherUser);
}

export function groupMemberLabel(count: number): string {
  return `${count} üye`;
}

export function formatConversationDraftPreview(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const clipped = normalized.length > 80 ? `${normalized.slice(0, 80)}…` : normalized;
  return `Taslak: ${clipped}`;
}

export function conversationAvatar(item: ConversationListItem): string | null {
  if (item.type === 'group' && item.avatarUrl) return item.avatarUrl;
  return participantAvatarUrl(item.otherUser);
}

export function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Dün';
  }

  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export type PresenceStatus = {
  label: string;
  tone: 'online' | 'recent' | 'offline';
};

const ONLINE_STALE_MS = 90_000;

function formatRelativeLastSeen(lastSeenAt: string): PresenceStatus {
  const seen = new Date(lastSeenAt).getTime();
  const diffMs = Math.max(0, Date.now() - seen);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);

  if (diffSec < 60) {
    return { label: 'Az önce görüldü', tone: 'recent' };
  }

  if (diffMin < 60) {
    return { label: `${diffMin} dk önce görüldü`, tone: 'offline' };
  }

  if (diffMin < 24 * 60) {
    const hours = Math.floor(diffMin / 60);
    return { label: `${hours} saat önce görüldü`, tone: 'offline' };
  }

  return {
    label: new Date(lastSeenAt).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }),
    tone: 'offline',
  };
}

export function formatPresence(
  lastSeenAt: string | null | undefined,
  isOnline?: boolean | null,
  lastActiveAt?: string | null,
): PresenceStatus {
  const now = Date.now();

  if (isOnline) {
    const activeMs = lastActiveAt ? new Date(lastActiveAt).getTime() : now;
    if (now - activeMs < ONLINE_STALE_MS) {
      return { label: 'Çevrimiçi', tone: 'online' };
    }
  }

  if (!isOnline && lastSeenAt) {
    return formatRelativeLastSeen(lastSeenAt);
  }

  if (!lastSeenAt && lastActiveAt) {
    return formatRelativeLastSeen(lastActiveAt);
  }

  if (!lastSeenAt) {
    return { label: 'Son görülme gizli', tone: 'offline' };
  }

  return formatRelativeLastSeen(lastSeenAt);
}

export function formatReplyPreview(message: {
  content: string;
  messageType: string;
  deletedForAll?: boolean;
}): string {
  if (message.deletedForAll) return 'Bu mesaj silindi';
  if (message.content?.trim()) return message.content.trim();

  switch (message.messageType) {
    case 'image':
      return 'Fotoğraf';
    case 'video':
      return 'Video';
    case 'audio':
      return 'Ses kaydı';
    case 'location':
      return 'Konum';
    case 'file':
      return 'Dosya';
    case 'shared_post':
      return 'Gönderi';
    case 'shared_reel':
      return 'Reel';
    case 'shared_profile':
      return 'Profil';
    case 'shared_marketplace_listing':
      return 'İlan';
    case 'shared_job_listing':
      return 'İş ilanı';
    case 'shared_staff_listing':
      return 'Personel talebi';
    case 'shared_vora_need':
      return 'İhtiyaç';
    case 'call':
      return message.content?.trim() || 'Arama';
    default:
      return 'Mesaj';
  }
}

export function formatActivityLabel(activity: ChatActivity, name: string): string {
  switch (activity) {
    case 'recording':
      return `${name} ses kaydediyor...`;
    case 'picking_photo':
      return `${name} fotoğraf seçiyor...`;
    case 'picking_video':
      return `${name} video seçiyor...`;
    default:
      return `${name} yazıyor...`;
  }
}

export function parseLocationContent(content: string): ChatLocationPayload | null {
  try {
    const parsed = JSON.parse(content) as Partial<ChatLocationPayload>;
    if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
      return {
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        label: parsed.label,
        street: parsed.street,
        district: parsed.district,
        city: parsed.city,
        region: parsed.region,
        country: parsed.country,
        postalCode: parsed.postalCode,
        accuracy: typeof parsed.accuracy === 'number' ? parsed.accuracy : undefined,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function formatChatLocationAddress(payload: ChatLocationPayload): string {
  const parts = [payload.street, payload.district, payload.city, payload.region, payload.country].filter(
    (part): part is string => typeof part === 'string' && part.length > 0,
  );
  if (parts.length > 0) return parts.join(', ');
  return payload.label ?? `${payload.latitude.toFixed(5)}, ${payload.longitude.toFixed(5)}`;
}

export function buildLocationPayloadFromGeocode(
  latitude: number,
  longitude: number,
  geo: LocationGeocodedAddress | undefined,
  accuracy?: number | null,
): ChatLocationPayload {
  const street = [geo?.street, geo?.streetNumber].filter(Boolean).join(' ').trim();
  const district = geo?.district ?? geo?.subregion ?? undefined;
  const city = geo?.city ?? undefined;
  const region = geo?.region ?? undefined;
  const country = geo?.country ?? undefined;
  const label =
    [street, district, city].filter((part): part is string => Boolean(part && part.length > 0)).join(', ') ||
    geo?.name ||
    'Konum';

  return {
    latitude,
    longitude,
    label,
    street: street || undefined,
    district,
    city,
    region,
    country,
    postalCode: geo?.postalCode ?? undefined,
    accuracy: accuracy ?? undefined,
  };
}

export function parseFileContent(content: string): { name: string; mimeType?: string } | null {
  try {
    const parsed = JSON.parse(content) as { name?: string; mimeType?: string };
    if (parsed.name) return { name: parsed.name, mimeType: parsed.mimeType };
  } catch {
    return null;
  }
  return null;
}

export function conversationDetailFromListItem(item: ConversationListItem): ConversationDetail {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    avatarUrl: item.avatarUrl,
    otherUser: item.otherUser,
    otherLastReadAt: null,
    members: [],
    memberCount: item.memberCount,
    myRole: null,
  };
}

export function minimalConversationDetail(conversationId: string): ConversationDetail {
  return {
    id: conversationId,
    type: 'direct',
    title: null,
    avatarUrl: null,
    otherUser: null,
    otherLastReadAt: null,
    members: [],
    memberCount: 0,
    myRole: null,
  };
}

export function findCachedConversationListItem(
  userId: string,
  conversationId: string,
  getList: (userId: string, archivedOnly: boolean) => ConversationListItem[] | null,
): ConversationListItem | undefined {
  return (
    getList(userId, false)?.find((item) => item.id === conversationId) ??
    getList(userId, true)?.find((item) => item.id === conversationId)
  );
}

export function formatCallDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt) return '—';
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const seconds = Math.max(0, Math.floor((end - start) / 1000));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
