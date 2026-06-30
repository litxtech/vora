import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, SectionList, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import {
  MarketplaceSellerSaleRow,
  sellerSalePressTarget,
} from '@/features/marketplace/components/MarketplaceSellerSaleRow';
import { MarketplaceSellerEarningsPanel } from '@/features/marketplace/components/MarketplaceSellerEarningsPanel';
import {
  MARKETPLACE_ACCENT,
  marketplaceAccountPath,
  saleDateGroupLabel,
} from '@/features/marketplace/constants';
import { exportSellerSalesPdf } from '@/features/marketplace/services/salesStatementPdfExport';
import { computeSellerEarningsSummary } from '@/features/marketplace/services/sellerEarnings';
import { fetchSellerSales } from '@/features/marketplace/services/sellerSalesData';
import type { SellerSaleRecord } from '@/features/marketplace/types';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type SaleSection = {
  title: string;
  data: SellerSaleRecord[];
};

function groupSalesByDate(sales: SellerSaleRecord[]): SaleSection[] {
  const sections: SaleSection[] = [];
  for (const sale of sales) {
    const title = saleDateGroupLabel(sale.soldAt);
    const last = sections[sections.length - 1];
    if (last?.title === title) {
      last.data.push(sale);
    } else {
      sections.push({ title, data: [sale] });
    }
  }
  return sections;
}

export function SellerSalesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const [sales, setSales] = useState<SellerSaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setSales(await fetchSellerSales(user.id));
    setLoading(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const summary = useMemo(() => computeSellerEarningsSummary(sales), [sales]);
  const sections = useMemo(() => groupSalesByDate(sales), [sales]);

  const exportPdf = async () => {
    if (!sales.length) {
      Alert.alert('PDF', 'Dışa aktarılacak satış kaydı yok.');
      return;
    }
    setExporting(true);
    const result = await exportSellerSalesPdf(sales, profile?.full_name);
    setExporting(false);
    if (result.error) Alert.alert('PDF', result.error);
  };

  return (
    <GradientBackground>
      <SectionList
        sections={sections}
        keyExtractor={(s) => s.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xl,
          flexGrow: 1,
        }}
        ListHeaderComponent={
          <>
            <AuthHeader title="Satışlarım" subtitle="Kazanç dökümü — manuel ve platform satışları" />
            <MarketplaceSellerEarningsPanel summary={summary} />

            <View style={styles.actionsCard}>
              <QuickAction
                icon="document-text-outline"
                label={exporting ? 'Hazırlanıyor…' : 'PDF özeti'}
                accent={MARKETPLACE_ACCENT}
                onPress={exportPdf}
                disabled={exporting || !sales.length}
              />
              <QuickAction
                icon="grid-outline"
                label="Hesap paneli"
                accent={colors.primary}
                onPress={() => router.push(marketplaceAccountPath() as never)}
              />
              <QuickAction
                icon="card-outline"
                label="IBAN profili"
                accent="#5C6BC0"
                onPress={() => router.push('/marketplace-center/payout-profile' as never)}
              />
            </View>

            {sales.length > 0 ? (
              <View style={styles.listHead}>
                <Text variant="label">Satış dökümü</Text>
                <View style={[styles.countBadge, { backgroundColor: `${MARKETPLACE_ACCENT}18` }]}>
                  <Text variant="caption" style={{ color: MARKETPLACE_ACCENT, fontWeight: '700' }}>
                    {sales.length}
                  </Text>
                </View>
              </View>
            ) : null}
          </>
        }
        renderSectionHeader={({ section }) => (
          <Text variant="caption" secondary style={styles.sectionLabel}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => {
          const target = sellerSalePressTarget(item);
          return (
            <View style={styles.saleItem}>
              <MarketplaceSellerSaleRow
                sale={item}
                onPress={() => router.push(target.path as never)}
              />
            </View>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <GlassCard style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: `${MARKETPLACE_ACCENT}14` }]}>
                <Ionicons name="bag-outline" size={28} color={MARKETPLACE_ACCENT} />
              </View>
              <Text variant="label" style={{ textAlign: 'center' }}>
                Henüz satış yok
              </Text>
              <Text variant="caption" secondary style={{ textAlign: 'center' }}>
                İlanlarınız satıldığında brüt, komisyon ve net kazanç burada listelenir.
              </Text>
            </GlassCard>
          ) : null
        }
        refreshing={loading}
        onRefresh={load}
      />
    </GradientBackground>
  );
}

function QuickAction({
  icon,
  label,
  accent,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  accent: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.quickAction,
        {
          backgroundColor: `${accent}10`,
          borderColor: `${accent}28`,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={icon} size={16} color={accent} />
      </View>
      <Text variant="caption" style={[styles.quickActionLabel, { color: colors.text }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionsCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontWeight: '600',
    fontSize: 11,
    textAlign: 'center',
  },
  listHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  sectionLabel: {
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
    textTransform: 'capitalize',
  },
  saleItem: {
    marginBottom: spacing.sm,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    marginTop: spacing.md,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
});
