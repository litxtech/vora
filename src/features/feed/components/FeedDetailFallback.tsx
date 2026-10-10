import { useLocalSearchParams } from 'expo-router';
import { DetailLoadingShell } from '@/components/ui/DetailLoadingShell';
import { PostDetailPending } from '@/features/feed/components/PostDetailPending';
import { readRememberedFeedItem } from '@/features/feed/services/feedItemMemory';
import type { FeedSourceType } from '@/features/feed/types';

type FeedDetailFallbackProps = {
  sourceType: FeedSourceType;
  title: string;
};

function routeId(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/** Akışta görülen kayıt varsa onu çizer; yoksa detay iskeleti. */
export function FeedDetailFallback({ sourceType, title }: FeedDetailFallbackProps) {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = routeId(params.id);
  const item = id ? readRememberedFeedItem(sourceType, id) : null;
  if (!item) return <DetailLoadingShell gradient />;
  return <PostDetailPending item={item} title={title} />;
}

export function PostDetailFallback() {
  return <FeedDetailFallback sourceType="post" title="Gönderi" />;
}

export function IncidentDetailFallback() {
  return <FeedDetailFallback sourceType="incident" title="Olay" />;
}

export function EventDetailFallback() {
  return <FeedDetailFallback sourceType="event" title="Etkinlik" />;
}

export function JobDetailFallback() {
  return <FeedDetailFallback sourceType="job" title="İş ilanı" />;
}

export function BusinessDetailFallback() {
  return <FeedDetailFallback sourceType="business" title="İşletme" />;
}

export function LostFoundDetailFallback() {
  return <FeedDetailFallback sourceType="lost_found" title="Kayıp eşya" />;
}
