import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { PROVIDER_BADGE_DEFS, VORA_HIZMETLER_ACCENT } from '@/features/vora-hizmetler/constants';
import type { ProviderBadge } from '@/features/vora-hizmetler/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ProviderBadgeRowProps = {
  badges: ProviderBadge[];
  compact?: boolean;
};

export function ProviderBadgeRow({ badges, compact = false }: ProviderBadgeRowProps) {
  if (!badges.length) return null;

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {badges.map((badgeId) => {
        const def = PROVIDER_BADGE_DEFS.find((b) => b.id === badgeId);
        if (!def) return null;
        return (
          <View
            key={badgeId}
            style={[styles.badge, { backgroundColor: `${def.color}14`, borderColor: `${def.color}33` }]}
          >
            <Text style={{ fontSize: compact ? 11 : 13 }}>{def.emoji}</Text>
            {!compact ? (
              <Text variant="caption" style={{ color: def.color, fontWeight: '600', fontSize: 11 }}>
                {def.label}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

type VerificationRowProps = {
  identityVerified: boolean;
  workplaceVerified: boolean;
};

export function VerificationRow({
  identityVerified,
  workplaceVerified,
}: VerificationRowProps) {
  const { colors } = useTheme();
  const items = [
    { ok: identityVerified, label: 'Kimlik', icon: 'person-circle-outline' as const },
    { ok: workplaceVerified, label: 'İşyeri', icon: 'business-outline' as const },
  ];

  return (
    <View style={styles.verifyRow}>
      {items.map((item) => {
        const tone = item.ok ? '#10B981' : colors.textSecondary;
        return (
          <View
            key={item.label}
            style={[
              styles.verifyPill,
              {
                backgroundColor: item.ok ? `${tone}14` : `${colors.textSecondary}10`,
                borderColor: item.ok ? `${tone}33` : colors.border,
              },
            ]}
          >
            <Ionicons name={item.ok ? 'checkmark-circle' : item.icon} size={15} color={tone} />
            <Text
              variant="caption"
              style={{ color: item.ok ? colors.text : colors.textSecondary, fontWeight: '600' }}
            >
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

type RatingStarsProps = {
  rating: number;
  reviewCount?: number;
  size?: number;
};

export function RatingStars({ rating, reviewCount, size = 14 }: RatingStarsProps) {
  const { colors } = useTheme();
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <View style={styles.starRow}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < fullStars ? 'star' : i === fullStars && hasHalf ? 'star-half' : 'star-outline'}
          size={size}
          color="#F59E0B"
        />
      ))}
      <Text variant="label" style={{ color: VORA_HIZMETLER_ACCENT, marginLeft: 4 }}>
        {rating.toFixed(1)}
      </Text>
      {reviewCount != null ? (
        <Text secondary variant="caption">
          ({reviewCount})
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  rowCompact: {
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  verifyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  verifyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
