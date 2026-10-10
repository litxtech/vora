import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { FullScreenMediaViewer } from '@/components/media/FullScreenMediaViewer';
import { MediaCarousel } from '@/features/feed/components/MediaCarousel';
import { getFeedMediaMaxHeight } from '@/lib/device/androidPerfProfile';
import { isLocalVideoUri, isVideoUrl } from '@/lib/media/isVideoUrl';

export function CanlarMediaGallery({
  urls,
  bleed = false,
}: {
  urls: string[];
  bleed?: boolean;
}) {
  const { width } = useWindowDimensions();
  const [openAt, setOpenAt] = useState<number | null>(null);
  const [slide, setSlide] = useState(0);
  if (urls.length === 0) return null;
  const activeUrl = urls[slide] ?? '';
  const activeIsVideo = Boolean(activeUrl) && (isVideoUrl(activeUrl) || isLocalVideoUri(activeUrl));
  const videoOn = bleed && activeIsVideo && openAt == null;

  return (
    <View style={bleed ? [styles.bleed, { width }] : undefined}>
      <MediaCarousel
        urls={urls}
        variant={bleed ? 'fullBleed' : 'inline'}
        maxHeight={bleed ? 520 : getFeedMediaMaxHeight()}
        inlineVideo={videoOn}
        videoMounted={videoOn}
        videoActive={videoOn}
        videoMuted
        onSlideIndexChange={setSlide}
        onMediaPress={setOpenAt}
      />
      <FullScreenMediaViewer
        urls={urls}
        visible={openAt != null}
        startIndex={openAt ?? 0}
        onClose={() => setOpenAt(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bleed: { width: '100%' },
});
