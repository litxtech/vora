import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { RatingStars } from '@/features/vora-hizmetler/components/ProviderBadgeRow';
import { HizmetStatChip } from '@/features/vora-hizmetler/components/HizmetStatCard';
import {
  serviceCategoryLabel,
  serviceProviderDetailPath,
  VORA_HIZMETLER_ACCENT,
  VORA_HIZMETLER_GRADIENT,
} from '@/features/vora-hizmetler/constants';
import type { ProviderDiscoverItem } from '@/features/vora-hizmetler/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ProviderDiscoverCardProps = {
  provider: ProviderDiscoverItem;
};

export function ProviderDiscoverCard({ provider }: ProviderDiscoverCardProps) {
  const { colors } = useTheme();
  const primaryCategory = provider.categories[0];

  const openProfile = () => {
    router.push(serviceProviderDetailPath(provider.id) as never);
  };

  return (
    <Pressable onPress={openProfile} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
      <GlassCard style={styles.card} padded={false}>
        <View style={styles.inner}>
          <View style={styles.avatarWrap}>
            {provider.avatarUrl ? (
              <Image source={{ uri: provider.avatarUrl }} style={styles.avatar} />
            ) : (
              <LinearGradient colors={[...VORA_HIZMETLER_GRADIENT]} style={styles.avatar}>
                <Text variant="label" style={{ color: '#fff' }}>
                  {provider.displayName[0]?.toUpperCase() ?? 'U'}
                </Text>
              </LinearGradient>
            )}
            {provider.isPremium ? (
              <View style={styles.premiumDot}>
                <Ionicons name="star" size={10} color="#fff" />
              </View>
            ) : null}
          </View>

          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text variant="label" numberOfLines={1} style={styles.name}>
                {provider.displayName}
              </Text>
              {provider.identityVerified ? (
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              ) : null}
            </View>

            <Text secondary variant="caption" numberOfLines={1}>
              {provider.profession}
            </Text>

            {primaryCategory ? (
              <View style={[styles.categoryChip, { backgroundColor: `${VORA_HIZMETLER_ACCENT}12` }]}>
                <Text variant="caption" style={{ color: VORA_HIZMETLER_ACCENT, fontWeight: '700' }}>
                  {serviceCategoryLabel(primaryCategory)}
                </Text>
              </View>
            ) : null}

            <RatingStars rating={provider.rating} reviewCount={provider.reviewCount} size={13} />

            <View style={styles.statsRow}>
              <HizmetStatChip icon="briefcase-outline" label={`${provider.completedJobs} iş`} color="#0EA5E9" />
              <HizmetStatChip icon="star-outline" label={`${provider.rating.toFixed(1)} puan`} color="#F59E0B" />
              <HizmetStatChip icon="chatbubble-outline" label={`${provider.reviewCount} yorum`} color="#8B5CF6" />
              {provider.city ? (
                <HizmetStatChip icon="location-outline" label={provider.city} muted />
              ) : null}
            </View>

            {provider.latestReviewComment ? (
              <View style={[styles.reviewPreview, { backgroundColor: `${colors.textSecondary}08` }]}>
                <Ionicons name="quote" size={12} color={colors.textMuted} />
                <Text secondary variant="caption" numberOfLines={2} style={styles.reviewText}>
                  {provider.latestReviewComment}
                </Text>
              </View>
            ) : null}
          </View>

          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  body: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    flex: 1,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 6,
  },
  reviewPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  reviewText: {
    flex: 1,
    lineHeight: 16,
  },
});
