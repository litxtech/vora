import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { BUSINESS_ROUTES, shopAccentColor } from '@/features/business-center/constants';
import { BUSINESS_FEATURE } from '@/features/business-center/featureFlags';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  businessId: string;
  businessName?: string | null;
  shopTagline?: string | null;
  shopAccent?: string | null;
  productCount?: number;
  hotelCount?: number;
  isOwnProfile?: boolean;
};

function buildVisitorSubtitle(productCount: number, hotelCount: number): string {
  const parts: string[] = [];
  if (productCount > 0) parts.push(`${productCount} ürün`);
  if (hotelCount > 0) parts.push(`${hotelCount} otel`);
  if (parts.length === 0) return 'Canlı vitrin · hemen keşfedin';
  return `${parts.join(' · ')} · canlı vitrin`;
}

export function ProfileShopButton({
  businessId,
  businessName,
  shopTagline,
  shopAccent,
  productCount = 0,
  hotelCount = 0,
  isOwnProfile = false,
}: Props) {
  const { colors } = useTheme();
  const showShopView = useFeatureVisible(BUSINESS_FEATURE.quick.shopView);
  const showCurate = useFeatureVisible(BUSINESS_FEATURE.quick.curate);
  const accent = shopAccentColor(shopAccent);
  const title = isOwnProfile ? 'Mağazamı gör' : 'Mağazayı gör';
  const subtitle = isOwnProfile
    ? shopTagline?.trim() || 'Müşterilerin gördüğü canlı vitrin'
    : shopTagline?.trim() || buildVisitorSubtitle(productCount, hotelCount);

  if (!showShopView && !(isOwnProfile && showCurate)) return null;

  return (
    <View style={styles.wrap}>
      {showShopView ? (
      <Pressable
        onPress={() => router.push(BUSINESS_ROUTES.shop(businessId) as never)}
        style={({ pressed }) => [
          styles.button,
          {
            borderColor: `${accent}55`,
            backgroundColor: `${accent}12`,
            opacity: pressed ? 0.86 : 1,
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${accent}22` }]}>
          <Ionicons name="bag-handle-outline" size={18} color={accent} />
        </View>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text variant="label" style={{ color: colors.text, fontWeight: '800' }}>
              {title}
            </Text>
            {!isOwnProfile ? (
              <View style={[styles.livePill, { backgroundColor: `${accent}18`, borderColor: `${accent}33` }]}>
                <View style={styles.liveDot} />
                <Text variant="caption" style={{ color: accent, fontWeight: '800', fontSize: 9 }}>
                  CANLI
                </Text>
              </View>
            ) : null}
          </View>
          <Text secondary variant="caption" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={accent} />
      </Pressable>
      ) : null}

      {isOwnProfile && showCurate ? (
        <Pressable
          onPress={() => router.push(BUSINESS_ROUTES.shopCurate as never)}
          style={({ pressed }) => [
            styles.editBtn,
            { borderColor: accent, backgroundColor: `${accent}14`, opacity: pressed ? 0.86 : 1 },
          ]}
        >
          <Ionicons name="create-outline" size={16} color={accent} />
          <Text variant="caption" style={{ color: accent, fontWeight: '800' }}>
            Düzenle
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 2, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#4CAF50' },
  editBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
