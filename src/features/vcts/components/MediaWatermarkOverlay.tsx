import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { PostMusicSoundToggle } from '@/features/music/components/PostMusicSoundToggle';
import { formatTrustCodeShort } from '@/features/vcts/constants';

type MediaWatermarkOverlayProps = {
  username: string;
  trustCode?: string | null;
  musicSoundEnabled?: boolean;
  onMusicSoundToggle?: () => void;
};

export function MediaWatermarkOverlay({
  username,
  trustCode,
  musicSoundEnabled,
  onMusicSoundToggle,
}: MediaWatermarkOverlayProps) {
  const showSoundToggle = Boolean(onMusicSoundToggle);

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.logoBadge}>
        <Text style={styles.logoText}>VORA</Text>
      </View>
      <View style={styles.bottomRow}>
        {trustCode ? (
          <Text style={styles.meta}>ID: {formatTrustCodeShort(trustCode)}</Text>
        ) : (
          <View />
        )}
        <View style={styles.userRow}>
          <Text style={styles.username}>@{username}</Text>
          {showSoundToggle ? (
            <PostMusicSoundToggle
              enabled={musicSoundEnabled ?? false}
              onToggle={onMusicSoundToggle!}
              style={styles.soundToggle}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 10,
  },
  logoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(10, 14, 20, 0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  logoText: {
    color: 'rgba(128, 222, 234, 0.9)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  meta: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 9,
    fontWeight: '600',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '600',
  },
  soundToggle: {
    width: 30,
    height: 30,
  },
});
