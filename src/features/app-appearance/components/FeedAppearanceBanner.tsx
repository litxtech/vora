import { DEFAULT_APP_APPEARANCE } from '@/features/app-appearance/constants';
import { useAppearanceOptional } from '@/providers/appearanceContext';
import { LobbyAnnouncementBanner } from '@/features/app-appearance/components/LobbyAnnouncementBanner';

export function FeedAppearanceBanner() {
  const appearance = useAppearanceOptional();
  const banner = (appearance?.config ?? DEFAULT_APP_APPEARANCE).feed.banner;
  if (!banner.enabled || !banner.title.trim()) return null;

  return (
    <LobbyAnnouncementBanner
      storageKeyPrefix="feed_banner_dismissed"
      announcements={[
        {
          id: 'feed_banner',
          enabled: true,
          title: banner.title,
          message: banner.message,
          tone: banner.tone,
          dismissible: banner.dismissible,
        },
      ]}
    />
  );
}
