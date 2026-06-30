import type { CommunitiesScreenTab, CommunityCategory, CommunityDetailTab, CommunityMemberRole } from '@/features/communities/types';

export const COMMUNITY_CATEGORIES: { id: CommunityCategory; label: string }[] = [
  { id: 'general', label: 'Genel' },
  { id: 'sports', label: 'Spor' },
  { id: 'news', label: 'Haber' },
  { id: 'jobs', label: 'İş & Kariyer' },
  { id: 'tech', label: 'Yazılım & Teknoloji' },
  { id: 'tourism', label: 'Turizm' },
  { id: 'culture', label: 'Kültür' },
];

export const DEMO_COMMUNITIES = [
  {
    name: 'Trabzonspor',
    slug: 'trabzonspor',
    description: 'Bordo-mavi camia — maçlar, transferler ve taraftar sohbeti.',
    category: 'sports' as const,
    regionId: 'trabzon',
  },
  {
    name: 'Karadeniz Haber',
    slug: 'karadeniz-haber',
    description: 'Bölgesel haberler, muhabir paylaşımları ve gündem tartışmaları.',
    category: 'news' as const,
    regionId: null,
  },
  {
    name: 'İş Arayanlar',
    slug: 'is-arayanlar',
    description: 'İş ilanları, başvuru tavsiyeleri ve kariyer sohbeti.',
    category: 'jobs' as const,
    regionId: null,
  },
  {
    name: 'Yazılımcılar',
    slug: 'yazilimcilar',
    description: 'Yazılım geliştirme, freelance ve teknoloji topluluğu.',
    category: 'tech' as const,
    regionId: null,
  },
  {
    name: 'Turizm Çalışanları',
    slug: 'turizm-calisanlari',
    description: 'Otel, restoran ve turizm sektörü profesyonelleri.',
    category: 'tourism' as const,
    regionId: null,
  },
];

export function communityCategoryLabel(category: CommunityCategory): string {
  return COMMUNITY_CATEGORIES.find((c) => c.id === category)?.label ?? category;
}

export function communityDetailPath(id: string): string {
  return `/communities/${id}`;
}

export function communityMemberProfilePath(userId: string): string {
  return `/user/${userId}`;
}

export function communityComposePath(communityId: string, communityName?: string): string {
  const params = new URLSearchParams({ communityId });
  if (communityName) params.set('communityName', communityName);
  return `/compose?${params.toString()}`;
}

export function communityCreateEventPath(communityId: string, communityName?: string): string {
  const params = new URLSearchParams({ communityId });
  if (communityName) params.set('communityName', communityName);
  return `/event-center/create?${params.toString()}`;
}

export const COMMUNITY_ROLE_LABELS: Record<CommunityMemberRole, string> = {
  owner: 'Kurucu',
  admin: 'Yönetici',
  moderator: 'Moderatör',
  member: 'Üye',
};

export const COMMUNITY_MEMBER_PREVIEW_LIMIT = 8;

export const COMMUNITY_FEED_PAGE_SIZE = 20;

export const COMMUNITIES_SCREEN_TABS: { id: CommunitiesScreenTab; label: string; icon: string }[] = [
  { id: 'feed', label: 'Anasayfa', icon: 'home-outline' },
  { id: 'discover', label: 'Keşfet', icon: 'compass-outline' },
  { id: 'mine', label: 'Topluluklarım', icon: 'heart-outline' },
];

export const COMMUNITY_DETAIL_TABS: { id: CommunityDetailTab; label: string; icon: string }[] = [
  { id: 'posts', label: 'Gönderiler', icon: 'newspaper-outline' },
  { id: 'chat', label: 'Sohbet', icon: 'chatbubbles-outline' },
  { id: 'events', label: 'Etkinlikler', icon: 'calendar-outline' },
  { id: 'members', label: 'Üyeler', icon: 'people-outline' },
  { id: 'rules', label: 'Kurallar', icon: 'shield-outline' },
  { id: 'about', label: 'Hakkında', icon: 'information-circle-outline' },
];
