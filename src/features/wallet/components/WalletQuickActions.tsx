import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { POINTS_GRADIENT } from '@/features/wallet/constants';
import { radius, spacing } from '@/constants/theme';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { WALLET_FEATURE } from '@/features/wallet/featureFlags';
import { useTheme } from '@/providers/ThemeProvider';

type ActionDef = {
  key: string;
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: readonly [string, string];
  href: Href;
  featureId?: string;
};

const ACTIONS: ActionDef[] = [
  {
    key: 'referral',
    label: 'Hakediş',
    subtitle: 'Davet kazançları',
    icon: 'gift',
    gradient: ['#7C3AED', '#5B21B6'],
    href: '/referral',
    featureId: WALLET_FEATURE.quickReferral,
  },
  {
    key: 'insights',
    label: 'İstatistikler',
    subtitle: 'Puan kuralları',
    icon: 'stats-chart',
    gradient: POINTS_GRADIENT,
    href: '/settings/insights',
    featureId: WALLET_FEATURE.quickInsights,
  },
  {
    key: 'marketplace',
    label: 'Yerel Pazar',
    subtitle: 'Satış yap',
    icon: 'storefront',
    gradient: ['#FF9800', '#E65100'],
    href: '/marketplace-center/account',
    featureId: 'marketplace',
  },
  {
    key: 'rides',
    label: 'Yolculuk',
    subtitle: 'Sürücü ol',
    icon: 'car',
    gradient: ['#2196F3', '#1565C0'],
    href: '/rides-center/account',
    featureId: 'rides',
  },
];

export function WalletQuickActions() {
  const { colors } = useTheme();
  const showMarketplace = useFeatureVisible('marketplace');
  const showRides = useFeatureVisible('rides');
  const showReferral = useFeatureVisible(WALLET_FEATURE.quickReferral);
  const showInsights = useFeatureVisible(WALLET_FEATURE.quickInsights);

  const visible = ACTIONS.filter((action) => {
    if (action.featureId === WALLET_FEATURE.quickReferral) return showReferral;
    if (action.featureId === WALLET_FEATURE.quickInsights) return showInsights;
    if (action.featureId === 'marketplace') return showMarketplace;
    if (action.featureId === 'rides') return showRides;
    return true;
  });

  if (visible.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text variant="label" style={styles.title}>
        Hızlı işlemler
      </Text>
      <View style={styles.row}>
        {visible.map((action) => (
          <Pressable
            key={action.key}
            onPress={() => router.push(action.href)}
            style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.88 : 1 }]}
          >
            <LinearGradient
              colors={[`${action.gradient[0]}EE`, `${action.gradient[1]}CC`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.tile}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={action.icon} size={18} color="#fff" />
              </View>
              <Text variant="caption" style={styles.tileLabel} numberOfLines={1}>
                {action.label}
              </Text>
              <Text variant="caption" style={styles.tileSub} numberOfLines={1}>
                {action.subtitle}
              </Text>
            </LinearGradient>
          </Pressable>
        ))}
      </View>
      <View style={[styles.hint, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}22` }]}>
        <Ionicons name="information-circle-outline" size={14} color={colors.primary} />
        <Text variant="caption" secondary style={{ flex: 1 }}>
          Güven puanı topluluk güvenilirliğinizi ölçer. 80 puanda tatil fırsatı, 100 puanda tatil havuzuna giriş hakkı kazanırsınız.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tile: {
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 96,
    justifyContent: 'space-between',
    gap: 4,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tileLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  tileSub: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
