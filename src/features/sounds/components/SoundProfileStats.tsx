import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { fetchUserSoundStats } from '@/features/sounds/services/soundData';
import type { SoundAuthorStats } from '@/features/sounds/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type SoundProfileStatsProps = {
  userId: string;
};

export function SoundProfileStats({ userId }: SoundProfileStatsProps) {
  const { colors } = useTheme();
  const [stats, setStats] = useState<SoundAuthorStats | null>(null);

  useEffect(() => {
    void fetchUserSoundStats(userId).then(setStats);
  }, [userId]);

  if (!stats || stats.totalSounds === 0) return null;

  const items = [
    { label: 'Toplam Ses', value: stats.totalSounds, icon: 'musical-notes-outline' as const },
    { label: 'Kullanım', value: stats.totalUsage, icon: 'repeat-outline' as const },
    { label: 'Dinlenme', value: stats.totalListens, icon: 'headset-outline' as const },
    { label: 'Beğeni', value: stats.totalLikes, icon: 'heart-outline' as const },
  ];

  return (
    <GlassCard style={styles.card}>
      <Text variant="label" style={styles.title}>
        Ses İstatistikleri
      </Text>
      <View style={styles.grid}>
        {items.map((item) => (
          <View key={item.label} style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name={item.icon} size={16} color={colors.accent} />
            <Text variant="title">{item.value.toLocaleString('tr-TR')}</Text>
            <Text secondary variant="caption">
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: { fontWeight: '700' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  item: {
    width: '47%',
    flexGrow: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
});
