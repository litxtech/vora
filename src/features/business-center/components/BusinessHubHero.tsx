import { Image, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { Text } from '@/components/ui/Text';
import {
  BUSINESS_GRADIENT,
  COMMERCE_MODE_LABELS,
  businessSectorIcon,
  businessSectorLabel,
} from '@/features/business-center/constants';
import type { BusinessAccountRecord, BusinessHubStats } from '@/features/business-center/types';
import { BusinessVerifiedTick } from '@/features/profile/components/BusinessVerifiedTick';
import { formatCents } from '@/features/marketplace/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  business: BusinessAccountRecord;
  stats: BusinessHubStats;
  accent: string;
  topInset: number;
  onBack?: () => void;
};

function StatPill({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
}) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.statPill,
        {
          borderColor: `${accent}30`,
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.72)',
        },
      ]}
    >
      <View style={[styles.statIcon, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={icon} size={14} color={accent} />
      </View>
      <Text variant="caption" secondary style={{ fontSize: 10, color: colors.textMuted }}>
        {label}
      </Text>
      <Text variant="label" style={{ fontWeight: '900', fontSize: 15 }}>
        {value}
      </Text>
    </View>
  );
}

export function BusinessHubHero({ business, stats, accent, topInset, onBack }: Props) {
  const { colors, isDark } = useTheme();
  const coverUri = business.coverUrl ?? business.logoUrl;

  return (
    <View style={styles.wrap}>
      <View style={[styles.coverWrap, { marginHorizontal: -spacing.lg }]}>
        {coverUri ? (
          <>
            <OptimizedImage
              uri={coverUri}
              style={styles.coverImage}
              tier="full"
              contentFit="cover"
              recyclingKey={`hub-cover-${business.id}`}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.55)', `${colors.background}F5`]}
              locations={[0, 0.5, 1]}
              style={styles.coverFade}
              pointerEvents="none"
            />
          </>
        ) : (
          <LinearGradient
            colors={
              isDark
                ? ([`${accent}80`, `${accent}40`, colors.background] as const)
                : ([`${accent}CC`, `${accent}66`, colors.surfaceElevated] as const)
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.coverFallback}
          >
            <Ionicons name="storefront" size={88} color={`${accent}30`} style={styles.coverPattern} />
          </LinearGradient>
        )}

        <View style={[styles.topBar, { paddingTop: topInset + spacing.xs }]}>
          {onBack ? (
            <Pressable onPress={onBack} style={[styles.iconBtn, { backgroundColor: `${colors.background}CC` }]}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </Pressable>
          ) : (
            <View />
          )}
          <View style={[styles.hubPill, { backgroundColor: `${colors.background}CC` }]}>
            <Ionicons name="grid-outline" size={12} color={accent} />
            <Text variant="caption" style={{ fontWeight: '800', fontSize: 10 }}>
              İşletme Paneli
            </Text>
          </View>
        </View>

        <View style={styles.logoOverlay}>
          <LinearGradient colors={BUSINESS_GRADIENT} style={styles.logoRing}>
            {business.logoUrl ? (
              <View style={[styles.logoFrame, { backgroundColor: colors.background }]}>
                <Image source={{ uri: business.logoUrl }} style={styles.logo} resizeMode="contain" />
              </View>
            ) : (
              <View style={[styles.logoPlaceholder, { backgroundColor: colors.background }]}>
                <Ionicons name="storefront" size={26} color={accent} />
              </View>
            )}
          </LinearGradient>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.chips}>
          <View style={[styles.chip, { backgroundColor: `${accent}16` }]}>
            <Ionicons name={businessSectorIcon(business.category)} size={11} color={accent} />
            <Text variant="caption" style={{ color: accent, fontWeight: '700' }}>
              {businessSectorLabel(business.category)}
            </Text>
          </View>
          <View style={[styles.chip, { backgroundColor: `${accent}16` }]}>
            <Ionicons name="bag-handle-outline" size={11} color={accent} />
            <Text variant="caption" style={{ color: accent, fontWeight: '700' }}>
              {COMMERCE_MODE_LABELS[business.commerceMode]}
            </Text>
          </View>
          {business.shopPublished ? (
            <View style={[styles.chip, { backgroundColor: 'rgba(76,175,80,0.14)' }]}>
              <View style={styles.liveDot} />
              <Text variant="caption" style={{ color: '#4CAF50', fontWeight: '700' }}>
                Mağaza canlı
              </Text>
            </View>
          ) : null}
          {business.isVerified ? (
            <View style={[styles.chip, { backgroundColor: 'rgba(255,179,0,0.14)' }]}>
              <BusinessVerifiedTick size={12} />
              <Text variant="caption" style={{ color: '#FFB300', fontWeight: '700' }}>
                Doğrulanmış
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.nameRow}>
          <Text variant="h2" style={styles.name} numberOfLines={2}>
            {business.name}
          </Text>
        </View>

        {business.shopTagline ? (
          <Text secondary variant="caption" style={styles.tagline}>
            {business.shopTagline}
          </Text>
        ) : null}

        <View style={styles.statsRow}>
          <StatPill label="Net kazanç" value={formatCents(stats.netEarningsCents)} icon="wallet-outline" accent={accent} />
          <StatPill label="Bekleyen" value={formatCents(stats.pendingPayoutCents)} icon="time-outline" accent="#FF8F00" />
          <StatPill
            label="Vitrin"
            value={`${stats.productCount + stats.hotelCount}`}
            icon="layers-outline"
            accent="#5C6BC0"
          />
        </View>

        <View style={styles.footerStats}>
          <MiniStat icon="pricetags-outline" label={`${stats.activeProducts} aktif ürün`} />
          <MiniStat icon="bed-outline" label={`${stats.hotelCount} otel`} />
          <MiniStat icon="calendar-outline" label={`${stats.reservationCount} rezervasyon`} />
        </View>
      </View>
    </View>
  );
}

function MiniStat({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.miniStat}>
      <Ionicons name={icon} size={12} color={colors.textMuted} />
      <Text secondary variant="caption" style={{ fontSize: 11 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  coverWrap: { height: 200, position: 'relative' },
  coverImage: { ...StyleSheet.absoluteFillObject },
  coverFade: { ...StyleSheet.absoluteFillObject },
  coverFallback: { flex: 1, overflow: 'hidden' },
  coverPattern: { position: 'absolute', right: -8, bottom: -12 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  hubPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  logoOverlay: { position: 'absolute', left: spacing.lg, bottom: -26, zIndex: 3 },
  logoRing: { padding: 3, borderRadius: radius.xl },
  logoFrame: {
    width: 68,
    height: 68,
    borderRadius: radius.lg - 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 68, height: 68 },
  logoPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: radius.lg - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingTop: spacing.xl + spacing.sm, gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4CAF50' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  name: { flex: 1, fontWeight: '900' },
  tagline: { fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  statPill: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.sm,
    gap: 3,
    alignItems: 'flex-start',
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  footerStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
  },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
