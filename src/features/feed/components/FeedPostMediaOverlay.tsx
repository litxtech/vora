import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { MusicMarqueeOverlay } from '@/features/music/components/MusicMarqueeOverlay';
import { PostMusicSoundToggle } from '@/features/music/components/PostMusicSoundToggle';
import type { MusicAttribution } from '@/features/music/types';
import { formatTrustCodeShort } from '@/features/vcts/constants';
import { spacing } from '@/constants/theme';

type FeedPostMediaOverlayProps = {
  music?: MusicAttribution | null;
  musicAnimating?: boolean;
  slideIndex?: number;
  slideCount?: number;
  username?: string;
  trustCode?: string | null;
  musicSoundEnabled?: boolean;
  onMusicSoundToggle?: () => void;
};

/** Akış gönderisi — ID ve kullanıcı adı resmin altında, düz metin */
export function FeedPostMediaOverlay({
  music,
  musicAnimating = false,
  slideIndex,
  slideCount = 0,
  username,
  trustCode,
  musicSoundEnabled,
  onMusicSoundToggle,
}: FeedPostMediaOverlayProps) {
  const showMusic = Boolean(music);
  const showCounter = slideCount > 1 && slideIndex != null;
  const showSoundToggle = Boolean(onMusicSoundToggle);
  const showId = Boolean(trustCode);
  const showUsername = Boolean(username);

  if (!showMusic && !showCounter && !showId && !showUsername && !showSoundToggle) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {showMusic || showCounter ? (
        <View style={styles.topStack} pointerEvents="box-none">
          {showMusic && music ? (
            <MusicMarqueeOverlay music={music} animating={musicAnimating} maxWidth={200} />
          ) : null}
          {showCounter ? (
            <Text variant="caption" style={styles.counterText}>
              {slideIndex! + 1}/{slideCount}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.flexSpacer} pointerEvents="none" />

      {showId || showUsername || showSoundToggle ? (
        <View style={styles.bottomRow} pointerEvents="box-none">
          <View style={styles.bottomMeta}>
            {showId ? (
              <Text style={styles.idText}>ID · {formatTrustCodeShort(trustCode!)}</Text>
            ) : null}
            {showUsername ? <Text style={styles.usernameText}>@{username}</Text> : null}
          </View>
          {showSoundToggle ? (
            <View pointerEvents="auto">
              <PostMusicSoundToggle
                enabled={musicSoundEnabled ?? false}
                onToggle={onMusicSoundToggle!}
                style={styles.soundToggle}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    padding: spacing.sm,
  },
  topStack: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
    gap: 6,
    maxWidth: '92%',
  },
  flexSpacer: {
    flex: 1,
  },
  counterText: {
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '600',
    fontSize: 11,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  bottomMeta: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  idText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  usernameText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 10,
    fontWeight: '600',
  },
  soundToggle: {
    width: 30,
    height: 30,
  },
});
