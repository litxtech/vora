import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import type { MusicUsageCreatorPreview } from '@/features/music/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MusicUsageCreatorStripProps = {
  creators: MusicUsageCreatorPreview[];
};

export function MusicUsageCreatorStrip({ creators }: MusicUsageCreatorStripProps) {
  const { colors } = useTheme();

  if (creators.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text variant="label" style={styles.title}>
        Bu müziği kullanan hesaplar
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {creators.map((entry) => (
          <Pressable
            key={entry.author.id}
            style={({ pressed }) => [styles.creatorCell, pressed && { opacity: 0.85 }]}
            onPress={() => router.push(`/u/${entry.author.username}` as never)}
          >
            <ProfileAvatar
              username={entry.author.username}
              avatarUrl={entry.author.avatarUrl}
              size={56}
              isVerified={entry.author.isVerified}
            />
            <Text variant="caption" numberOfLines={1} style={styles.username}>
              @{entry.author.username}
            </Text>
            <View style={[styles.countBadge, { backgroundColor: `${colors.accent}18` }]}>
              <Ionicons name="musical-note" size={10} color={colors.accent} />
              <Text variant="caption" style={{ color: colors.accent, fontSize: 10 }}>
                {entry.usageCount}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  row: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  creatorCell: {
    width: 72,
    alignItems: 'center',
    gap: 4,
  },
  username: {
    fontSize: 10,
    textAlign: 'center',
    maxWidth: 72,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
});
