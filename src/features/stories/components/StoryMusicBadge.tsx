import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';

type StoryMusicBadgeProps = {
  title: string;
  artist?: string | null;
  onPress?: () => void;
  /** Konum etiketi varsa biraz yukarı kay */
  stacked?: boolean;
};

/** Sol alt — modern müzik rozeti */
export function StoryMusicBadge({ title, artist, onPress, stacked = false }: StoryMusicBadgeProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.wrap, stacked && styles.wrapStacked]}
      hitSlop={6}
    >
      <LinearGradient
        colors={['rgba(124,58,237,0.55)', 'rgba(30,136,229,0.45)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBorder}
      >
        <View style={styles.inner}>
          <View style={styles.disc}>
            <Ionicons name="musical-notes" size={14} color="#fff" />
          </View>
          <View style={styles.meta}>
            <Text variant="caption" style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {artist ? (
              <Text variant="caption" style={styles.artist} numberOfLines={1}>
                {artist}
              </Text>
            ) : null}
          </View>
          {onPress ? (
            <Ionicons name="chevron-up" size={14} color="rgba(255,255,255,0.7)" />
          ) : null}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.lg,
    zIndex: 10,
    maxWidth: '78%',
  },
  wrapStacked: {
    bottom: spacing.lg + 40,
  },
  gradientBorder: {
    borderRadius: 14,
    padding: 1.5,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(8,8,14,0.82)',
  },
  disc: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  title: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  artist: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '600',
  },
});
