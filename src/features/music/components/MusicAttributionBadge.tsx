import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import type { MusicAttribution } from '@/features/music/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MusicAttributionBadgeProps = {
  music: MusicAttribution;
  light?: boolean;
};

export function MusicAttributionBadge({ music, light }: MusicAttributionBadgeProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      style={[
        styles.row,
        light
          ? styles.rowLight
          : { backgroundColor: `${colors.textMuted}10`, borderRadius: radius.full },
      ]}
      onPress={() => router.push(`/music/${music.trackId}` as never)}
      hitSlop={8}
    >
      <View style={[styles.iconWrap, { backgroundColor: light ? 'rgba(255,255,255,0.15)' : `${colors.accent}18` }]}>
        <Ionicons name="musical-notes" size={12} color={light ? '#fff' : colors.accent} />
      </View>
      <View style={styles.meta}>
        <Text
          variant="caption"
          style={[styles.title, light && styles.lightText]}
          numberOfLines={1}
        >
          {music.displayTitle}
        </Text>
        {music.artist ? (
          <Text
            variant="caption"
            style={[styles.artist, light && styles.lightSub]}
            numberOfLines={1}
          >
            {music.artist}
          </Text>
        ) : null}
      </View>
      <Ionicons
        name="chevron-forward"
        size={12}
        color={light ? 'rgba(255,255,255,0.65)' : colors.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  rowLight: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.full,
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flex: 1, minWidth: 0 },
  title: { fontSize: 12, fontWeight: '600' },
  artist: { fontSize: 11 },
  lightText: { color: '#fff' },
  lightSub: { color: 'rgba(255,255,255,0.75)' },
});
