import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';

type StoryMusicBadgeProps = {
  title: string;
  artist?: string | null;
  onPress?: () => void;
  /** Konum etiketi varsa biraz yukarı kay */
  stacked?: boolean;
};

/** Sol alt — cam efektli müzik rozeti */
export function StoryMusicBadge({ title, artist, onPress, stacked = false }: StoryMusicBadgeProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.wrap, stacked && styles.wrapStacked]}
      hitSlop={6}
    >
      <View style={styles.shadow}>
        <LinearGradient
          colors={['rgba(167,139,250,0.35)', 'rgba(37,99,235,0.2)', 'rgba(255,255,255,0.06)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBorder}
        >
          <View style={styles.inner}>
            <LinearGradient
              colors={['#7c3aed', '#2563eb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.disc}
            >
              <Ionicons name="musical-notes" size={13} color="#fff" />
            </LinearGradient>
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
              <Ionicons name="chevron-up" size={13} color="rgba(255,255,255,0.55)" />
            ) : null}
          </View>
        </LinearGradient>
      </View>
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
    bottom: spacing.lg + 48,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  gradientBorder: {
    borderRadius: radius.full,
    padding: 1,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: radius.full - 1,
    backgroundColor: 'rgba(8,8,14,0.78)',
  },
  disc: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  title: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 16,
  },
  artist: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
});
