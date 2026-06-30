import { Image, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { HotelStarRating } from '@/features/hotel-center/components/HotelStarRating';
import { HOTEL_ACCENT, HOTEL_GUEST_TYPE_LABELS } from '@/features/hotel-center/constants';
import type { HotelReview } from '@/features/hotel-center/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  reviews: HotelReview[];
  loading?: boolean;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export function HotelReviewList({ reviews, loading }: Props) {
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={[styles.hintBox, { backgroundColor: colors.surfaceElevated }]}>
        <Text secondary variant="caption">Yükleniyor…</Text>
      </View>
    );
  }

  if (reviews.length === 0) {
    return (
      <View style={[styles.hintBox, { backgroundColor: colors.surfaceElevated }]}>
        <Text secondary variant="caption">Henüz değerlendirme yok.</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {reviews.map((review) => (
        <View key={review.id} style={[styles.reviewRow, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
          <View style={styles.topRow}>
            {review.reviewerAvatarUrl ? (
              <Image source={{ uri: review.reviewerAvatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: `${HOTEL_ACCENT}18` }]}>
                <Text variant="caption" style={{ color: HOTEL_ACCENT, fontWeight: '700', fontSize: 11 }}>
                  {(review.reviewerUsername ?? '?')[0]?.toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.meta}>
              <Text variant="caption" style={{ fontWeight: '700' }} numberOfLines={1}>
                {review.reviewerUsername ?? 'Misafir'}
              </Text>
              <Text secondary variant="caption" style={styles.metaSub}>
                {HOTEL_GUEST_TYPE_LABELS[review.guestType]} · {formatDate(review.createdAt)}
              </Text>
            </View>
            <HotelStarRating rating={review.rating} size={12} />
          </View>
          {review.comment ? (
            <Text variant="caption" secondary style={styles.comment} numberOfLines={4}>
              {review.comment}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs },
  hintBox: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  reviewRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarPlaceholder: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  meta: { flex: 1, gap: 0 },
  metaSub: { fontSize: 10, lineHeight: 13 },
  comment: { lineHeight: 16, paddingLeft: 36 },
});
