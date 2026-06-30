import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { fetchPlatformDebts } from '@/features/admin/services/platformDebtManagement';
import { formatDebt } from '@/features/ads/services/adBilling';
import type { PlatformDebtRow } from '@/features/ads/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function AdminPlatformDebtScreen() {
  const { colors } = useTheme();
  const [items, setItems] = useState<PlatformDebtRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setItems(await fetchPlatformDebts(100));
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const totalDebt = items.reduce((sum, item) => sum + item.platformDebtCents, 0);

  return (
    <AdminShell
      title="Platform Borcu Olan Hesaplar"
      subtitle="Ücretli reklam tıklamalarından biriken borçlar"
      refreshing={refreshing}
      onRefresh={() => void load(true)}
    >
      {!loading && items.length > 0 ? (
        <GlassCard style={styles.summary}>
          <Text variant="caption" secondary>
            Toplam borç ({items.length} hesap)
          </Text>
          <Text variant="h2" style={{ color: colors.danger }}>
            {formatDebt(totalDebt)}
          </Text>
        </GlassCard>
      ) : null}

      {loading ? (
        <AdminEmptyState loading />
      ) : items.length === 0 ? (
        <AdminEmptyState
          title="Borçlu hesap yok"
          message="Platform borcu olan kullanıcı bulunmuyor."
          icon="wallet-outline"
        />
      ) : (
        items.map((item) => (
          <GlassCard key={item.userId} style={styles.row}>
            <View style={styles.rowTop}>
              <View style={styles.copy}>
                <Text variant="label">@{item.username}</Text>
                {item.fullName ? (
                  <Text secondary variant="caption">
                    {item.fullName}
                  </Text>
                ) : null}
              </View>
              <Text variant="label" style={{ color: colors.danger }}>
                {formatDebt(item.platformDebtCents)}
              </Text>
            </View>

            <View style={styles.meta}>
              <View style={styles.metaItem}>
                <Ionicons
                  name={item.hasCardOnFile ? 'card' : 'card-outline'}
                  size={14}
                  color={item.hasCardOnFile ? colors.success : colors.warning}
                />
                <Text variant="caption" secondary>
                  {item.hasCardOnFile ? 'Kart kayıtlı' : 'Kart yok'}
                </Text>
              </View>
              <Text variant="caption" secondary>
                Güncelleme: {new Date(item.updatedAt).toLocaleDateString('tr-TR')}
              </Text>
            </View>

            <Pressable
              onPress={() => router.push(`/admin/users/${item.userId}` as never)}
              style={[styles.linkBtn, { borderColor: colors.border }]}
            >
              <Text variant="caption" style={{ color: colors.primary }}>
                Profili aç
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </Pressable>
          </GlassCard>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  summary: {
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  row: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  copy: { flex: 1, gap: 2 },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
