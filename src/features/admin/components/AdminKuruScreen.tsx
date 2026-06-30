import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFormField } from '@/features/admin/components/shared/AdminFormField';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { AdminStatCard } from '@/features/admin/components/shared/AdminStatCard';
import { AdminUserSearchPicker } from '@/features/admin/components/shared/AdminUserSearchPicker';
import {
  adminAdjustKuru,
  fetchAdminKuruStats,
  fetchAdminKuruTransactions,
  fetchAdminUserKuru,
} from '@/features/admin/services/kuruManagement';
import type { AdminUserRow } from '@/features/admin/types';
import type { AdminJetonStats, AdminJetonTransaction } from '@/features/wallet/types';
import { JetonTransactionRow } from '@/features/wallet/components/JetonTransactionRow';
import { formatJetonBalance, JETON_SYMBOL } from '@/features/wallet/constants';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function AdminKuruScreen() {
  const { colors } = useTheme();
  const [stats, setStats] = useState<AdminJetonStats | null>(null);
  const [transactions, setTransactions] = useState<AdminJetonTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [selectedBalance, setSelectedBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const [{ data }, txs] = await Promise.all([
      fetchAdminKuruStats(),
      fetchAdminKuruTransactions(50),
    ]);

    setStats(data);
    setTransactions(txs);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedUser) {
      setSelectedBalance(null);
      return;
    }

    void fetchAdminUserKuru(selectedUser.id).then(({ summary }) => {
      setSelectedBalance(summary.balance);
    });
  }, [selectedUser]);

  const handleAdjust = async (sign: 1 | -1) => {
    const parsedAmount = parseInt(amount, 10);

    if (!selectedUser) {
      Alert.alert('Hata', 'Önce listeden bir kullanıcı seçin.');
      return;
    }

    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Hata', 'Geçerli bir tutar girin.');
      return;
    }

    setAdjusting(true);

    const delta = parsedAmount * sign;
    const actionLabel = sign > 0 ? 'yüklensin' : 'kesilsin';

    Alert.alert(
      'Jeton düzenle',
      `@${selectedUser.username} hesabına ${parsedAmount} ${JETON_SYMBOL} ${actionLabel} mi?`,
      [
        { text: 'Vazgeç', style: 'cancel', onPress: () => setAdjusting(false) },
        {
          text: 'Onayla',
          onPress: async () => {
            const { ok, balance, error } = await adminAdjustKuru(
              selectedUser.id,
              delta,
              note.trim() || undefined,
            );
            setAdjusting(false);

            if (!ok) {
              Alert.alert('Hata', error ?? 'İşlem başarısız.');
              return;
            }

            setSelectedBalance(balance);
            Alert.alert('Tamam', `Yeni bakiye: ${formatJetonBalance(balance ?? 0)}`);
            setAmount('');
            setNote('');
            load(true);
          },
        },
      ],
    );
  };

  return (
    <AdminShell
      title="Jeton Ekonomisi"
      subtitle="Bakiye, işlemler ve admin düzenlemeleri"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      {loading ? (
        <AdminEmptyState loading />
      ) : !stats ? (
        <AdminEmptyState title="Veri yok" message="Jeton istatistikleri alınamadı." icon="wallet-outline" />
      ) : (
        <>
          <View style={styles.stats}>
            <AdminStatCard
              label="Dolaşımdaki Jeton"
              value={formatJetonBalance(stats.totalBalance)}
              icon="wallet"
              accent={colors.warning}
            />
            <AdminStatCard label="Bakiyeli kullanıcı" value={String(stats.holdersCount)} icon="people-outline" />
            <AdminStatCard
              label="Bugün yüklenen"
              value={formatJetonBalance(stats.creditsToday)}
              icon="add-circle-outline"
              accent={colors.success}
            />
            <AdminStatCard
              label="Bugün harcanan"
              value={formatJetonBalance(stats.debitsToday)}
              icon="remove-circle-outline"
              accent={colors.danger}
            />
            <AdminStatCard label="Bugünkü işlem" value={String(stats.transactionsToday)} icon="swap-horizontal" />
          </View>

          <AdminSectionHeader title="Bakiye düzenle" />
          <GlassCard style={styles.form}>
            <AdminUserSearchPicker selectedUser={selectedUser} onSelectUser={setSelectedUser} />

            {selectedUser && selectedBalance != null ? (
              <View style={[styles.balancePreview, { backgroundColor: `${colors.warning}12`, borderColor: `${colors.warning}33` }]}>
                <Text variant="caption" muted>
                  Mevcut bakiye
                </Text>
                <Text variant="h3" style={{ color: colors.warning }}>
                  {formatJetonBalance(selectedBalance)}
                </Text>
              </View>
            ) : null}

            <AdminFormField
              label={`Tutar (${JETON_SYMBOL})`}
              placeholder="100"
              value={amount}
              onChangeText={setAmount}
            />
            <AdminFormField
              label="Not (isteğe bağlı)"
              placeholder="Kampanya bonusu, düzeltme..."
              value={note}
              onChangeText={setNote}
            />
            <View style={styles.adjustActions}>
              <AdminActionChip
                label="Yükle"
                icon="add-circle-outline"
                tone="success"
                onPress={() => handleAdjust(1)}
              />
              <AdminActionChip
                label="Kes"
                icon="remove-circle-outline"
                tone="danger"
                onPress={() => handleAdjust(-1)}
              />
            </View>
            {adjusting ? (
              <Text variant="caption" secondary>
                İşleniyor...
              </Text>
            ) : null}
          </GlassCard>

          <AdminSectionHeader title="Son işlemler" />
          {transactions.length === 0 ? (
            <AdminEmptyState title="İşlem yok" message="Henüz Jeton hareketi kaydedilmedi." icon="list-outline" />
          ) : (
            transactions.map((tx) => (
              <Pressable
                key={tx.id}
                onPress={() => router.push(`/admin/users/${tx.userId}` as Href)}
              >
                <JetonTransactionRow tx={tx} showUsername={tx.username} />
              </Pressable>
            ))
          )}
        </>
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  stats: { gap: spacing.xs, marginBottom: spacing.md },
  form: { gap: spacing.sm, marginBottom: spacing.md },
  balancePreview: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  adjustActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
