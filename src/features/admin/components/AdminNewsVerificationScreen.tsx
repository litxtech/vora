import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  emergencyQuarantineUser,
  fetchNewsVerificationOwners,
  removeAllUserContent,
  type NewsVerificationOwnerRow,
} from '@/features/admin/services/emergencyModeration';
import { overrideNewsVerification, removeNewsVerification } from '@/features/admin/services/phase3Management';
import { fetchNewsVerifications, type NewsVerificationRow } from '@/features/admin/services/reporterManagement';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const RESULT_LABELS: Record<string, string> = {
  correct: 'Doğru Haber',
  incorrect: 'Yanlış Haber',
  unverified: 'İnceleniyor',
};

type FilterTab = 'all' | 'correct' | 'incorrect' | 'unverified';

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'correct', label: 'Doğru' },
  { id: 'incorrect', label: 'Yanlış' },
  { id: 'unverified', label: 'İnceleme' },
];

export function AdminNewsVerificationScreen() {
  const { colors } = useTheme();
  const [items, setItems] = useState<NewsVerificationRow[]>([]);
  const [owners, setOwners] = useState<NewsVerificationOwnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>('all');

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const [nextItems, nextOwners] = await Promise.all([
      fetchNewsVerifications(),
      fetchNewsVerificationOwners(),
    ]);
    setItems(nextItems);
    setOwners(nextOwners);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((item) => item.result === filter);
  }, [items, filter]);

  const runAction = async (id: string, action: () => Promise<{ error: string | null }>) => {
    setActionId(id);
    const { error } = await action();
    setActionId(null);
    if (error) Alert.alert('İşlem başarısız', error);
    else await load(true);
  };

  const handleOverride = (item: NewsVerificationRow, result: 'correct' | 'incorrect' | 'unverified') => {
    const label = RESULT_LABELS[result] ?? result;
    Alert.alert('Sonucu güncelle', `${label} olarak işaretlensin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: () => void runAction(`${item.id}-${result}`, () => overrideNewsVerification(item.id, result)),
      },
    ]);
  };

  const handleRemove = (item: NewsVerificationRow) => {
    Alert.alert('Kaydı sil', 'Doğrulama kaydı silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => void runAction(`${item.id}-remove`, () => removeNewsVerification(item.id)),
      },
    ]);
  };

  const handleRemoveAuthorContent = (item: NewsVerificationRow) => {
    if (!item.author_id) return;
    Alert.alert(
      'İçerikleri kaldır',
      `@${item.author_username} kullanıcısının tüm yayın içerikleri kaldırılsın mı?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: () =>
            void runAction(`content-${item.author_id}`, () =>
              removeAllUserContent(item.author_id!, 'Haber doğrulama incelemesi'),
            ),
        },
      ],
    );
  };

  const handleEmergencyQuarantine = (item: NewsVerificationRow) => {
    if (!item.author_id) return;
    Alert.alert(
      'ACİL DURUM KİLİDİ',
      `@${item.author_username} hesabının tüm içerikleri kaldırılacak, hesap kilitlenecek ve oturumlar sonlandırılacak. Onaylıyor musunuz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Acil Kilitle',
          style: 'destructive',
          onPress: () =>
            void runAction(`quarantine-${item.author_id}`, () =>
              emergencyQuarantineUser(
                item.author_id!,
                `Haber doğrulama acil durum kilidi — ${RESULT_LABELS[item.result] ?? item.result}`,
              ),
            ),
        },
      ],
    );
  };

  const openAuthor = (authorId: string | null | undefined) => {
    if (!authorId) return;
    router.push(`/admin/users/${authorId}` as never);
  };

  return (
    <AdminShell
      title="Haber Doğrulama"
      subtitle="Doğru/yanlış haber işlemleri ve acil müdahale"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      {loading ? (
        <AdminEmptyState loading />
      ) : (
        <>
          {owners.length > 0 ? (
            <>
              <AdminSectionHeader title="En çok işaretlenen profiller" />
              {owners.slice(0, 5).map((owner) => (
                <Pressable key={owner.author_id} onPress={() => openAuthor(owner.author_id)}>
                  <GlassCard style={styles.ownerRow}>
                    <Text variant="label">@{owner.author_username}</Text>
                    <View style={styles.ownerStats}>
                      <Text variant="caption" style={{ color: '#43A047' }}>
                        Doğru: {owner.correct_count}
                      </Text>
                      <Text variant="caption" style={{ color: '#E53935' }}>
                        Yanlış: {owner.incorrect_count}
                      </Text>
                      <Text variant="caption" secondary>
                        Toplam: {owner.total_verifications}
                      </Text>
                    </View>
                  </GlassCard>
                </Pressable>
              ))}
            </>
          ) : null}

          <View style={styles.tabs}>
            {FILTER_TABS.map((tab) => {
              const active = filter === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setFilter(tab.id)}
                  style={[
                    styles.tab,
                    {
                      backgroundColor: active ? `${colors.primary}18` : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text variant="caption" style={{ color: active ? colors.primary : colors.textSecondary }}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {filteredItems.length === 0 ? (
            <AdminEmptyState
              title="Kayıt yok"
              message="Seçilen filtrede haber doğrulama kaydı bulunamadı."
              icon="shield-checkmark-outline"
            />
          ) : (
            filteredItems.map((item) => (
              <GlassCard key={item.id} style={styles.row}>
                <View style={styles.resultBadge}>
                  <Text variant="label" style={{ color: item.result === 'incorrect' ? '#E53935' : item.result === 'correct' ? '#43A047' : '#F9A825' }}>
                    {RESULT_LABELS[item.result] ?? item.result}
                  </Text>
                  <Text variant="caption" secondary>
                    {new Date(item.created_at).toLocaleString('tr-TR')}
                  </Text>
                </View>

                <Text variant="caption" secondary>
                  Doğrulayan: @{item.reporter_username}
                </Text>

                {item.author_username ? (
                  <Pressable onPress={() => openAuthor(item.author_id)}>
                    <Text variant="label" style={{ color: colors.primary }}>
                      İçerik sahibi: @{item.author_username}
                    </Text>
                  </Pressable>
                ) : null}

                <Text secondary variant="caption" numberOfLines={3}>
                  {item.content_snippet || '—'}
                </Text>

                <Text variant="caption" secondary>
                  {item.content_type === 'reel' ? 'Reel' : 'Gönderi'} · Doğru {item.content_correct_count} · Yanlış{' '}
                  {item.content_incorrect_count}
                </Text>

                {item.note ? (
                  <Text secondary variant="caption" numberOfLines={2}>
                    Not: {item.note}
                  </Text>
                ) : null}

                <View style={styles.actions}>
                  <AdminActionChip
                    label="Doğru"
                    icon="checkmark-circle"
                    tone="success"
                    loading={actionId === `${item.id}-correct`}
                    disabled={Boolean(actionId)}
                    onPress={() => handleOverride(item, 'correct')}
                    compact
                  />
                  <AdminActionChip
                    label="Yanlış"
                    icon="close-circle"
                    tone="danger"
                    loading={actionId === `${item.id}-incorrect`}
                    disabled={Boolean(actionId)}
                    onPress={() => handleOverride(item, 'incorrect')}
                    compact
                  />
                  <AdminActionChip
                    label="Profil"
                    icon="person-outline"
                    tone="primary"
                    disabled={!item.author_id || Boolean(actionId)}
                    onPress={() => openAuthor(item.author_id)}
                    compact
                  />
                  <AdminActionChip
                    label="İçerik sil"
                    icon="trash-outline"
                    tone="warning"
                    loading={actionId === `content-${item.author_id}`}
                    disabled={!item.author_id || Boolean(actionId)}
                    onPress={() => handleRemoveAuthorContent(item)}
                    compact
                  />
                  <AdminActionChip
                    label="Acil kilitle"
                    icon="lock-closed"
                    tone="danger"
                    loading={actionId === `quarantine-${item.author_id}`}
                    disabled={!item.author_id || Boolean(actionId)}
                    onPress={() => handleEmergencyQuarantine(item)}
                    compact
                  />
                  <AdminActionChip
                    label="Kayıt sil"
                    icon="close-outline"
                    tone="danger"
                    loading={actionId === `${item.id}-remove`}
                    disabled={Boolean(actionId)}
                    onPress={() => handleRemove(item)}
                    compact
                  />
                </View>
              </GlassCard>
            ))
          )}
        </>
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  ownerRow: { gap: spacing.xs },
  ownerStats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  tab: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  row: { gap: spacing.sm },
  resultBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
