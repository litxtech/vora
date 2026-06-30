import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { formatMarketplaceDate, MARKETPLACE_ACCENT } from '@/features/marketplace/constants';
import type { MarketplaceListing } from '@/features/marketplace/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  listing: MarketplaceListing;
};

export function MarketplaceListingStats({ listing }: Props) {
  const { colors } = useTheme();

  const stats = [
    { icon: 'eye-outline' as const, label: 'Görüntülenme', value: String(listing.viewCount) },
    { icon: 'heart-outline' as const, label: 'Favori', value: String(listing.favoriteCount) },
    { icon: 'chatbubble-outline' as const, label: 'Soru', value: String(listing.commentCount) },
    {
      icon: 'time-outline' as const,
      label: 'Yayın',
      value: formatMarketplaceDate(listing.createdAt).split(',')[0] ?? '—',
    },
  ];

  return (
    <GlassCard style={styles.card}>
      <View style={styles.grid}>
        {stats.map((stat) => (
          <View key={stat.label} style={[styles.stat, { backgroundColor: `${colors.surface}88` }]}>
            <View style={[styles.iconWrap, { backgroundColor: `${MARKETPLACE_ACCENT}16` }]}>
              <Ionicons name={stat.icon} size={14} color={MARKETPLACE_ACCENT} />
            </View>
            <Text variant="label" style={styles.value}>
              {stat.value}
            </Text>
            <Text secondary variant="caption">
              {stat.label}
            </Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: {
    width: '47%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  value: { fontWeight: '800', fontSize: 16 },
});
