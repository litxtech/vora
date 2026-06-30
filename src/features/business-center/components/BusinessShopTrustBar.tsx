import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { businessSectorLabel } from '@/features/business-center/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  category: string;
  viewCount: number;
  itemCount: number;
  isVerified: boolean;
  hotelRating?: { avg: number; count: number } | null;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  favoriteDisabled?: boolean;
};

function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}K`;
  if (value >= 1_000) return `${(value / 1000).toFixed(1).replace('.0', '')}K`;
  return String(value);
}

export function BusinessShopTrustBar({
  category,
  viewCount,
  itemCount,
  isVerified,
  hotelRating,
  isFavorite,
  onToggleFavorite,
  favoriteDisabled = false,
}: Props) {
  const { colors } = useTheme();

  const stats: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { icon: 'eye-outline', label: `${formatCount(viewCount)} görüntülenme` },
    { icon: 'grid-outline', label: `${itemCount} vitrin` },
    { icon: 'storefront-outline', label: businessSectorLabel(category) },
  ];

  if (hotelRating && hotelRating.count > 0) {
    stats.push({
      icon: 'star',
      label: `${hotelRating.avg.toFixed(1)} · ${hotelRating.count} değerlendirme`,
    });
  }

  return (
    <View style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
      <View style={styles.stats}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <Ionicons name={stat.icon} size={13} color={colors.textMuted} />
            <Text secondary variant="caption" style={styles.statText}>
              {stat.label}
            </Text>
          </View>
        ))}
        {isVerified ? (
          <View style={styles.stat}>
            <Ionicons name="shield-checkmark" size={13} color="#FFB300" />
            <Text variant="caption" style={{ color: '#FFB300', fontWeight: '700', fontSize: 11 }}>
              Doğrulanmış
            </Text>
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={onToggleFavorite}
        disabled={favoriteDisabled}
        accessibilityLabel={isFavorite ? 'Kayıtlı mağazadan çıkar' : 'Mağazayı kaydet'}
        style={({ pressed }) => [
          styles.favoriteBtn,
          {
            borderColor: isFavorite ? '#FFB300' : colors.border,
            backgroundColor: isFavorite ? 'rgba(255,179,0,0.12)' : colors.surface,
            opacity: pressed ? 0.88 : favoriteDisabled ? 0.5 : 1,
          },
        ]}
      >
        <Ionicons name={isFavorite ? 'bookmark' : 'bookmark-outline'} size={18} color={isFavorite ? '#FFB300' : colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  stats: { flex: 1, gap: spacing.xs },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 11, fontWeight: '600' },
  favoriteBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
