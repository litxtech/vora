import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { REGIONS } from '@/constants/regions';
import { trendRankLabel } from '@/features/discovery/constants';
import type { TrendBusiness } from '@/features/discovery/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type TrendBusinessCardProps = {
  business: TrendBusiness;
  rank: number;
};

export function TrendBusinessCard({ business, rank }: TrendBusinessCardProps) {
  const { colors } = useTheme();
  const regionName = REGIONS.find((r) => r.id === business.regionId)?.name ?? business.regionId;

  return (
    <Pressable onPress={() => router.push(`/detail/businesses/${business.id}` as never)}>
      <GlassCard style={styles.card}>
        <View style={styles.header}>
          <Text variant="label" style={styles.rank}>
            {trendRankLabel(rank)}
          </Text>
          {business.logoUrl ? (
            <Image source={{ uri: business.logoUrl }} style={styles.logo} />
          ) : (
            <View style={[styles.logoPlaceholder, { backgroundColor: `${colors.primary}22` }]}>
              <Ionicons name="storefront" size={20} color={colors.primary} />
            </View>
          )}
          <View style={styles.titleBlock}>
            <View style={styles.nameRow}>
              <Text variant="label" numberOfLines={1} style={styles.name}>
                {business.name}
              </Text>
              {business.isVerified ? (
                <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
              ) : null}
            </View>
            <Text secondary variant="caption" numberOfLines={1}>
              {business.category} · {regionName}
            </Text>
          </View>
        </View>

        {business.description ? (
          <Text secondary variant="caption" numberOfLines={2}>
            {business.description}
          </Text>
        ) : null}

        <View style={styles.meta}>
          <Meta icon="eye-outline" label={`${business.viewCount} görüntülenme`} colors={colors} />
          <Meta icon="people-outline" label={`${business.followerCount} takipçi`} colors={colors} />
        </View>
      </GlassCard>
    </Pressable>
  );
}

function Meta({
  icon,
  label,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={12} color={colors.textMuted} />
      <Text variant="caption" secondary>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rank: {
    minWidth: 28,
    textAlign: 'center',
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
  },
  logoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    flex: 1,
  },
  meta: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
