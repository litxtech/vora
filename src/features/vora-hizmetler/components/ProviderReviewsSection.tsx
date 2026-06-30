import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { RatingStars } from '@/features/vora-hizmetler/components/ProviderBadgeRow';
import { HizmetSectionHeader } from '@/features/vora-hizmetler/components/HizmetUi';
import { VORA_HIZMETLER_ACCENT } from '@/features/vora-hizmetler/constants';
import type { ServiceReviewListing } from '@/features/vora-hizmetler/types';
import { spacing } from '@/constants/theme';

type ProviderReviewsSectionProps = {
  providerId: string;
  rating: number;
  reviewCount: number;
  reviews: ServiceReviewListing[];
  isOwnProfile?: boolean;
};

export function ProviderReviewsSection({
  providerId,
  rating,
  reviewCount,
  reviews,
  isOwnProfile,
}: ProviderReviewsSectionProps) {
  const preview = reviews.slice(0, 2);

  return (
    <GlassCard style={styles.wrap}>
      <HizmetSectionHeader
        title="Değerlendirmeler"
        icon="star-outline"
        action={
          <Pressable
            onPress={() =>
              router.push(`/vora-hizmetler/provider-reviews?providerId=${providerId}` as never)
            }
          >
            <Text variant="caption" style={{ color: VORA_HIZMETLER_ACCENT, fontWeight: '700' }}>
              {isOwnProfile ? 'Tümünü Gör' : reviewCount > 0 ? 'Tümü' : 'Boş'}
            </Text>
          </Pressable>
        }
      />
      <RatingStars rating={rating} reviewCount={reviewCount} size={14} />

      {preview.length === 0 ? (
        <Text secondary variant="caption">
          {isOwnProfile
            ? 'Henüz değerlendirme yok. Tamamlanan işlerden sonra müşteriler puan verir.'
            : 'Henüz yorum yapılmamış.'}
        </Text>
      ) : (
        preview.map((review) => (
          <View key={review.id} style={styles.review}>
            <View style={styles.reviewTop}>
              <Text variant="label">{review.reviewerName}</Text>
              <RatingStars rating={review.overallRating} size={12} />
            </View>
            {review.comment ? (
              <Text secondary variant="caption" numberOfLines={3}>
                {review.comment}
              </Text>
            ) : null}
          </View>
        ))
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  review: {
    gap: 4,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148,163,184,0.25)',
  },
  reviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
