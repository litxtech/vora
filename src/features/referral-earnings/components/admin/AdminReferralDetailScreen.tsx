import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { useAdminGuard } from '@/features/admin/hooks/useAdminGuard';
import {
  REFERRAL_STATUS_COLORS,
  REFERRAL_STATUS_LABELS,
  formatReferralCents,
} from '@/features/referral-earnings/constants';
import {
  fetchReferralAdminDetail,
  referralAdminAddNote,
  referralAdminApprove,
  referralAdminBlacklistUser,
  referralAdminCancel,
  referralAdminManualGrant,
  referralAdminManualRemove,
  referralAdminMarkPaid,
  referralAdminReject,
  referralAdminReview,
} from '@/features/referral-earnings/services/referralAdmin';
import type { ReferralAdminDetail } from '@/features/referral-earnings/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function AdminReferralDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const guard = useAdminGuard();
  const { colors } = useTheme();
  const [detail, setDetail] = useState<ReferralAdminDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!id || guard.status !== 'allowed') return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setDetail(await fetchReferralAdminDetail(id));
      setLoading(false);
      setRefreshing(false);
    },
    [guard.status, id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (label: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setActing(true);
    const result = await fn();
    setActing(false);
    if (!result.ok) Alert.alert('Hata', result.error ?? 'İşlem başarısız');
    else {
      Alert.alert('Tamam', `${label} işlemi uygulandı.`);
      void load(true);
    }
  };

  const commissionId = id ?? '';

  return (
    <AdminShell
      title="Hakediş Detayı"
      subtitle={commissionId ? commissionId.slice(0, 8) : ''}
      refreshing={refreshing}
      onRefresh={() => void load(true)}
    >
      {loading ? (
        <AdminEmptyState loading />
      ) : !detail?.ok || !detail.commission ? (
        <AdminEmptyState title="Bulunamadı" message="Hakediş kaydı yüklenemedi." icon="alert-circle-outline" />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <GlassCard style={styles.card}>
            <Text variant="label">Durum</Text>
            <Text variant="h3" style={{ color: REFERRAL_STATUS_COLORS[detail.commission.status] }}>
              {REFERRAL_STATUS_LABELS[detail.commission.status]}
            </Text>
            <Text variant="h2" style={{ color: colors.success }}>
              {formatReferralCents(detail.commission.amountCents)}
            </Text>
            {detail.commission.note ? (
              <Text variant="caption" secondary>
                Not: {detail.commission.note}
              </Text>
            ) : null}
          </GlassCard>

          <GlassCard style={styles.card}>
            <Text variant="label">Davet Eden</Text>
            <Text variant="body">
              {detail.inviter?.fullName ?? detail.inviter?.username} (@{detail.inviter?.username})
            </Text>
            <AdminActionChip
              label="Profil"
              icon="person-outline"
              onPress={() => router.push(`/admin/users/${detail.inviter?.id}`)}
            />
          </GlassCard>

          <GlassCard style={styles.card}>
            <Text variant="label">Davet Edilen</Text>
            <Text variant="body">
              {detail.invitee?.fullName ?? detail.invitee?.username} (@{detail.invitee?.username})
            </Text>
            <Text variant="caption" secondary>
              Kayıt: {detail.invitee?.createdAt ? new Date(detail.invitee.createdAt).toLocaleString('tr-TR') : '—'}
            </Text>
            <Text variant="caption" secondary>
              Son giriş:{' '}
              {detail.invitee?.lastSeenAt
                ? new Date(detail.invitee.lastSeenAt).toLocaleString('tr-TR')
                : '—'}
            </Text>
            <AdminActionChip
              label="Profil"
              icon="person-outline"
              onPress={() => router.push(`/admin/users/${detail.invitee?.id}`)}
            />
          </GlassCard>

          <GlassCard style={styles.card}>
            <Text variant="label">Metrikler</Text>
            <MetricLine label="Davet Kodu" value={detail.inviteCode ?? '—'} />
            <MetricLine label="Aktif Süre" value={`${detail.metrics?.activeMinutes ?? 0} dk`} />
            <MetricLine label="Paylaşım" value={String(detail.metrics?.sharesCount ?? 0)} />
            <MetricLine label="Etkileşim" value={String(detail.metrics?.interactionsCount ?? 0)} />
            <MetricLine label="İhlal" value={String(detail.metrics?.violationsCount ?? 0)} />
            <MetricLine
              label="Şüpheli"
              value={detail.metrics?.isSuspicious || detail.commission.suspicious ? 'Evet' : 'Hayır'}
            />
          </GlassCard>

          <View style={styles.actions}>
            <AdminActionChip
              label="Onayla"
              icon="checkmark-outline"
              onPress={() => void runAction('Onay', () => referralAdminApprove(commissionId))}
              disabled={acting}
            />
            <AdminActionChip
              label="Reddet"
              icon="close-outline"
              onPress={() => void runAction('Red', () => referralAdminReject(commissionId))}
              disabled={acting}
            />
            <AdminActionChip
              label="İncele"
              icon="search-outline"
              onPress={() => void runAction('İnceleme', () => referralAdminReview(commissionId))}
              disabled={acting}
            />
            <AdminActionChip
              label="İptal"
              icon="ban-outline"
              onPress={() => void runAction('İptal', () => referralAdminCancel(commissionId))}
              disabled={acting}
            />
            <AdminActionChip
              label="Ödendi"
              icon="cash-outline"
              onPress={() => void runAction('Ödeme', () => referralAdminMarkPaid(commissionId))}
              disabled={acting}
            />
            <AdminActionChip
              label="Elle Ver"
              icon="add-circle-outline"
              onPress={() =>
                void runAction('Elle hakediş', () =>
                  referralAdminManualGrant(commissionId, detail.commission!.amountCents, 'Admin elle verdi'),
                )
              }
              disabled={acting}
            />
            <AdminActionChip
              label="Elle Sil"
              icon="remove-circle-outline"
              onPress={() => void runAction('Silme', () => referralAdminManualRemove(commissionId))}
              disabled={acting}
            />
            <AdminActionChip
              label="Not Ekle"
              icon="document-text-outline"
              onPress={() =>
                void runAction('Not', () => referralAdminAddNote(commissionId, 'Admin notu eklendi'))
              }
              disabled={acting}
            />
            <AdminActionChip
              label="Kara Liste"
              icon="skull-outline"
              onPress={() =>
                void runAction('Kara liste', () =>
                  referralAdminBlacklistUser(detail.invitee!.id, 'Hakediş detayından'),
                )
              }
              disabled={acting}
            />
          </View>

          <GlassCard style={styles.card}>
            <Text variant="label">Hakediş Geçmişi</Text>
            {(detail.logs ?? []).length === 0 ? (
              <Text variant="caption" secondary>
                Log kaydı yok.
              </Text>
            ) : (
              detail.logs?.map((log) => (
                <View key={log.id} style={styles.logRow}>
                  <Text variant="caption" muted>
                    {new Date(log.createdAt).toLocaleString('tr-TR')}
                  </Text>
                  <Text variant="caption">
                    {log.action}
                    {log.oldStatus && log.newStatus
                      ? `: ${log.oldStatus} → ${log.newStatus}`
                      : ''}
                  </Text>
                  {log.note ? (
                    <Text variant="caption" secondary>
                      {log.note}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
          </GlassCard>
        </ScrollView>
      )}
    </AdminShell>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricLine}>
      <Text variant="caption" secondary>
        {label}
      </Text>
      <Text variant="caption">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm, paddingBottom: spacing.xl },
  card: { gap: spacing.xs, marginBottom: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  logRow: { gap: 2, paddingVertical: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth },
  metricLine: { flexDirection: 'row', justifyContent: 'space-between' },
});
