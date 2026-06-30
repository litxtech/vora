import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { ProfileCollapsibleSection } from '@/features/profile/components/shared/ProfileCollapsibleSection';
import { formatCount } from '@/features/profile/constants';
import type { ProfileStats } from '@/features/profile/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type PremiumStatsCardProps = {
  stats: ProfileStats;
  layout?: 'collapsible' | 'section';
};

const PREMIUM_GOLD = '#FFB300';

export function PremiumStatsCard({ stats, layout = 'collapsible' }: PremiumStatsCardProps) {
  const { colors } = useTheme();

  const items = [
    { icon: 'eye-outline' as const, label: 'Görüntülenme', value: stats.totalViews },
    { icon: 'heart-outline' as const, label: 'Beğeni', value: stats.totalLikes },
    { icon: 'chatbubble-outline' as const, label: 'Yorum', value: stats.totalComments },
    { icon: 'repeat-outline' as const, label: 'Alıntı', value: stats.totalQuotes },
  ];

  const premiumTag = (
    <View style={styles.premiumTag}>
      <Text variant="caption" style={{ color: PREMIUM_GOLD, fontSize: 10, fontWeight: '700' }}>
        Premium
      </Text>
    </View>
  );

  const grid = (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={item.label} style={styles.itemOuter}>
          <LinearGradient
            colors={[`${PREMIUM_GOLD}18`, `${colors.surface}88`]}
            style={[styles.item, { borderColor: `${PREMIUM_GOLD}33` }]}
          >
            <Ionicons name={item.icon} size={18} color={PREMIUM_GOLD} />
            <Text variant="h3" style={{ fontWeight: '800' }}>
              {formatCount(item.value)}
            </Text>
            <Text secondary variant="caption">
              {item.label}
            </Text>
          </LinearGradient>
        </View>
      ))}
    </View>
  );

  if (layout === 'section') return grid;

  return (
    <ProfileCollapsibleSection
      title="Gelişmiş İstatistikler"
      icon="diamond"
      iconColor={PREMIUM_GOLD}
      trailing={premiumTag}
    >
      {grid}
    </ProfileCollapsibleSection>
  );
}

const styles = StyleSheet.create({
  premiumTag: {
    backgroundColor: 'rgba(255,179,0,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  itemOuter: { flex: 1, minWidth: '45%' },
  item: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
});
