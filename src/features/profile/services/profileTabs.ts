import { PROFILE_TABS } from '@/features/profile/constants';
import type { ProfileStats, ProfileTab } from '@/features/profile/types';
import type { Ionicons } from '@expo/vector-icons';

type TabDefinition = (typeof PROFILE_TABS)[number];

export function selectVisibleProfileTabs(input: {
  isOwnProfile: boolean;
  showLikedPosts: boolean;
}): TabDefinition[] {
  return PROFILE_TABS.filter((tab) => {
    if (tab.privateOnly && !input.isOwnProfile) return false;
    if (tab.id === 'liked' && !input.isOwnProfile && !input.showLikedPosts) return false;
    return true;
  });
}

export function resolveActiveProfileTab(tab: ProfileTab, visible: { id: ProfileTab }[]): ProfileTab {
  return visible.some((item) => item.id === tab) ? tab : 'posts';
}

export function profileTabCounts(input: {
  stats: ProfileStats;
  isOwnProfile: boolean;
  showLikedPosts: boolean;
  badgeCount: number;
}): Partial<Record<ProfileTab, number>> {
  const counts: Partial<Record<ProfileTab, number>> = {
    posts: input.stats.postCount,
    reels: input.stats.reelCount,
    badges: input.badgeCount,
  };

  if (typeof input.stats.quotePostCount === 'number') counts.quotes = input.stats.quotePostCount;
  if (typeof input.stats.mediaCount === 'number') counts.media = input.stats.mediaCount;

  const canSeeLikes = input.isOwnProfile || input.showLikedPosts;
  if (canSeeLikes && typeof input.stats.likedPostCount === 'number') {
    counts.liked = input.stats.likedPostCount;
  }
  if (input.isOwnProfile && typeof input.stats.savedPostCount === 'number') {
    counts.saved = input.stats.savedPostCount;
  }

  return counts;
}

const TAB_EMPTY: Record<
  ProfileTab,
  { title: string; ownMessage: string; visitorMessage: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  posts: {
    title: 'Gönderi yok',
    ownMessage: 'Henüz gönderi paylaşmadın.',
    visitorMessage: 'Henüz gönderi paylaşılmamış.',
    icon: 'grid-outline',
  },
  reels: {
    title: 'Reel yok',
    ownMessage: 'Henüz reel paylaşmadın.',
    visitorMessage: 'Henüz paylaşılmış reel bulunmuyor.',
    icon: 'play-circle-outline',
  },
  quotes: {
    title: 'Alıntı yok',
    ownMessage: 'Henüz bir gönderiyi alıntılamadın.',
    visitorMessage: 'Henüz alıntılanmış gönderi bulunmuyor.',
    icon: 'repeat-outline',
  },
  media: {
    title: 'Medya yok',
    ownMessage: 'Fotoğraf veya video içeren paylaşımın yok.',
    visitorMessage: 'Fotoğraf veya video içeren paylaşım bulunmuyor.',
    icon: 'images-outline',
  },
  liked: {
    title: 'Beğeni yok',
    ownMessage: 'Beğendiğin gönderiler burada görünür.',
    visitorMessage: 'Beğenilen gönderiler burada görünür.',
    icon: 'heart-outline',
  },
  saved: {
    title: 'Kayıt yok',
    ownMessage: 'Kaydettiğin gönderiler burada görünür.',
    visitorMessage: 'Kaydedilen gönderiler burada görünür.',
    icon: 'bookmark-outline',
  },
  badges: {
    title: 'Rozet yok',
    ownMessage: 'Kazandığın rozetler burada görünür.',
    visitorMessage: 'Henüz kazanılmış rozet bulunmuyor.',
    icon: 'ribbon-outline',
  },
};

export function profileTabEmptyCopy(tab: ProfileTab, isOwnProfile: boolean) {
  const copy = TAB_EMPTY[tab];
  return {
    title: copy.title,
    message: isOwnProfile ? copy.ownMessage : copy.visitorMessage,
    icon: copy.icon,
  };
}
