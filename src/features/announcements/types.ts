import type { RegionId } from '@/constants/regions';

export type AnnouncementMediaType = 'none' | 'image' | 'video';

/** Galeri içindeki tek bir medya öğesi (yayınlanmış / kalıcı). */
export type AnnouncementMediaItem = {
  type: 'image' | 'video';
  url: string;
  thumbnailUrl: string | null;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  mediaType: AnnouncementMediaType;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  media: AnnouncementMediaItem[];
  linkUrl: string | null;
  linkLabel: string | null;
  accent: string;
  isPinned: boolean;
  isActive: boolean;
  priority: number;
  regionId: RegionId | null;
  startsAt: string | null;
  endsAt: string | null;
  authorId: string | null;
  businessId: string | null;
  authorName: string | null;
  authorAvatarUrl: string | null;
  viewCount: number;
  ctaClickCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AnnouncementViewer = {
  userId: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  viewedAt: string;
};

/** Oluşturma/düzenleme ekranındaki taslak medya öğesi (yerel veya uzak). */
export type DraftMediaItem = {
  id: string;
  type: 'image' | 'video';
  /** Yüklenmeyi bekleyen yerel dosya (uzak ise null). */
  localUri: string | null;
  /** Yayınlanmış uzak URL (yükleme sonrası / düzenlemede dolu). */
  url: string | null;
  /** Yayınlanmış uzak küçük resim (video posteri). */
  thumbnailUrl: string | null;
  /** Yüklenmeyi bekleyen yerel küçük resim (video için). */
  thumbnailLocalUri: string | null;
};

export type AnnouncementDraft = {
  id?: string;
  title: string;
  body: string;
  mediaType: AnnouncementMediaType;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  localMediaUri: string | null;
  mediaItems: DraftMediaItem[];
  linkUrl: string;
  linkLabel: string;
  accent: string;
  regionId: RegionId | null;
  startsAt: string | null;
  endsAt: string | null;
  isPinned: boolean;
  priority: number;
  isActive: boolean;
};
