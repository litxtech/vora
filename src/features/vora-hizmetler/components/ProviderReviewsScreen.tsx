import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { RatingStars } from '@/features/vora-hizmetler/components/ProviderBadgeRow';
import { HizmetEmptyState, HizmetHeroBanner } from '@/features/vora-hizmetler/components/HizmetUi';
import { VORA_HIZMETLER_ACCENT, VORA_HIZMETLER_GRADIENT } from '@/features/vora-hizmetler/constants';
import { useMyProviderProfile } from '@/features/vora-hizmetler/hooks/useProviderProfile';
import { fetchProviderReviews } from '@/features/vora-hizmetler/services/reviewData';
import type { ServiceReviewListing } from '@/features/vora-hizmetler/types';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const CRITERIA_LABELS: { key: keyof ServiceReviewListing; label: string }[] = [
  { key: 'quality', label: 'Kalite' },
  { key: 'punctuality', label: 'Dakiklik' },
  { key: 'cleanliness', label: 'Temizlik' },
  { key: 'valueForMoney', label: 'Fiyat' },
  { key: 'communication', label: 'İletişim' },
];

export function ProviderReviewsScreen() {
  const { providerId: paramProviderId } = useLocalSearchParams<{ providerId?: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { provider: myProvider } = useMyProviderProfile(user?.id ?? null);
  const providerId = paramProviderId ?? myProvider?.id ?? null;

  const [reviews, setReviews] = useState<ServiceReviewListing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!providerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await fetchProviderReviews(providerId);
    setReviews(result.reviews);
    setLoading(false);
  }, [providerId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const averages = useMemo(() => {
    if (!reviews.length) return null;
    const sum = reviews.reduce(
      (acc, review) => ({
        quality: acc.quality + review.quality,
        punctuality: acc.punctuality + review.punctuality,
        cleanliness: acc.cleanliness + review.cleanliness,
        valueForMoney: acc.valueForMoney + review.valueForMoney,
        communication: acc.communication + review.communication,
      }),
      { quality: 0, punctuality: 0, cleanliness: 0, valueForMoney: 0, communication: 0 },
    );
    const count = reviews.length;
    return {
      quality: sum.quality / count,
      punctuality: sum.punctuality / count,
      cleanliness: sum.cleanliness / count,
      valueForMoney: sum.valueForMoney / count,
      communication: sum.communication / count,
      overall:
        (sum.quality + sum.punctuality + sum.cleanliness + sum.valueForMoney + sum.communication) /
        (5 * count),
    };
  }, [reviews]);

  if (loading) {
    return (
      <GradientBackground>
        <ActivityIndicator color={VORA_HIZMETLER_ACCENT} size="large" style={styles.loading} />
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <ScreenBackButton />

        <HizmetHeroBanner
          title="Değerlendirmeler"
          subtitle="Müşterilerin iş sonrası puan ve yorumları"
          icon="star-outline"
          compact
        />

        {averages ? (
          <GlassCard style={styles.summary} padded={false}>
            <LinearGradient colors={[...VORA_HIZMETLER_GRADIENT]} style={styles.summaryHero}>
              <Text variant="h1" style={styles.overallScore}>
                {averages.overall.toFixed(1)}
              </Text>
              <RatingStars rating={averages.overall} size={18} />
              <Text variant="caption" style={styles.reviewCount}>
                {reviews.length} değerlendirme
              </Text>
            </LinearGradient>
            <View style={styles.criteriaWrap}>
              {CRITERIA_LABELS.map(({ key, label }) => (
                <View key={key} style={styles.criteriaRow}>
                  <Text variant="caption" style={styles.criteriaLabel}>
                    {label}
                  </Text>
                  <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                    <LinearGradient
                      colors={[...VORA_HIZMETLER_GRADIENT]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.barFill,
                        { width: `${(Number(averages[key as keyof typeof averages]) / 5) * 100}%` },
                      ]}
                    />
                  </View>
                  <Text variant="caption" style={styles.criteriaValue}>
                    {Number(averages[key as keyof typeof averages]).toFixed(1)}
                  </Text>
                </View>
              ))}
            </View>
          </GlassCard>
        ) : (
          <HizmetEmptyState
            icon="chatbubble-outline"
            title="Henüz değerlendirme yok"
            description="Tamamlanan işlerden sonra müşteriler puan ve yorum bırakabilir."
          />
        )}

        {reviews.map((review) => (
          <GlassCard key={review.id} style={styles.review} padded={false}>
            <View style={[styles.reviewAccent, { backgroundColor: VORA_HIZMETLER_ACCENT }]} />
            <View style={styles.reviewBody}>
              <View style={styles.reviewHeader}>
                {review.reviewerAvatarUrl ? (
                  <Image source={{ uri: review.reviewerAvatarUrl }} style={styles.avatar} />
                ) : (
                  <LinearGradient colors={[...VORA_HIZMETLER_GRADIENT]} style={styles.avatar}>
                    <Ionicons name="person" size={18} color="#fff" />
                  </LinearGradient>
                )}
                <View style={styles.reviewMeta}>
                  <Text variant="label">{review.reviewerName}</Text>
                  <Text secondary variant="caption">
                    {new Date(review.createdAt).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <RatingStars rating={review.overallRating} size={14} />
              </View>
              {review.comment ? (
                <Text secondary variant="body" style={styles.comment}>
                  {review.comment}
                </Text>
              ) : null}
              {review.wouldRecommend ? (
                <View style={styles.recommend}>
                  <Ionicons name="thumbs-up" size={14} color="#22C55E" />
                  <Text variant="caption" style={{ color: '#22C55E', fontWeight: '700' }}>
                    Tavsiye ediyor
                  </Text>
                </View>
              ) : null}
            </View>
          </GlassCard>
        ))}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.lg,
    paddingBottom: 96,
    gap: spacing.md,
  },
  loading: {
    marginTop: 120,
    alignSelf: 'center',
  },
  summary: {
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  summaryHero: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  overallScore: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '800',
  },
  reviewCount: {
    color: 'rgba(255,255,255,0.9)',
  },
  criteriaWrap: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  criteriaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  criteriaLabel: {
    width: 72,
    fontWeight: '600',
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  criteriaValue: {
    width: 28,
    textAlign: 'right',
    fontWeight: '700',
  },
  review: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  reviewAccent: {
    width: 4,
  },
  reviewBody: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewMeta: {
    flex: 1,
    gap: 2,
  },
  comment: {
    lineHeight: 22,
  },
  recommend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
