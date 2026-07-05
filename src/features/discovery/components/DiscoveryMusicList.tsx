import { useCallback, type ReactElement } from 'react';
import { router, type Href } from 'expo-router';
import { MusicCatalogPanel } from '@/features/music/components/MusicCatalogPanel';
import type { AudioCatalogItem } from '@/features/music/types';
import { isPersistableMusicTrackId } from '@/features/music/utils/trackId';

type DiscoveryMusicListProps = {
  contentBottomInset: number;
  ListHeaderComponent?: ReactElement | null;
};

export function DiscoveryMusicList({
  contentBottomInset,
  ListHeaderComponent,
}: DiscoveryMusicListProps) {
  const openTrack = useCallback((item: AudioCatalogItem) => {
    if (item.source === 'sound') {
      router.push(`/sounds/${item.id}` as Href);
      return;
    }
    if (isPersistableMusicTrackId(item.id)) {
      router.push(`/music/${item.id}` as Href);
    }
  }, []);

  return (
    <MusicCatalogPanel
      contentBottomInset={contentBottomInset}
      ListHeaderComponent={ListHeaderComponent}
      onPickTrack={openTrack}
      onOpenTrack={openTrack}
      previewActionLabel="Detay"
    />
  );
}
