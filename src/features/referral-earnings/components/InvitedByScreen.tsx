import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { ReferralProgressBar } from '@/features/referral-earnings/components/ReferralProgressBar';
import {
  REFERRAL_STATUS_COLORS,
  REFERRAL_STATUS_LABELS,
} from '@/features/referral-earnings/constants';
import {
  establishReferralRelationship,
  fetchReferralInviteeProgress,
} from '@/features/referral-earnings/services/referralData';
import type { ReferralInviteeProgress } from '@/features/referral-earnings/types';
import { normalizeFriendInviteCodeInput } from '@/features/profile/services/friendInvite';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function InvitedByScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [progress, setProgress] = useState<ReferralInviteeProgress>({ hasInviter: false });
  const [codeInput, setCodeInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setProgress(await fetchReferralInviteeProgress());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async () => {
    const normalized = normalizeFriendInviteCodeInput(codeInput);
    if (!normalized) {
      setError('Davet kodunu girin');
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await establishReferralRelationship(normalized);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setCodeInput('');
    await load();
    Alert.alert('Başarılı', 'Davet ilişkiniz kaydedildi. Şartları tamamlayarak davet edenin hakediş kazanmasına yardımcı olabilirsiniz.');
  };

  const settings = progress.settings;
  const eval_ = progress.evaluation;

  return (
    <GradientBackground>
      <AuthHeader title="Beni Davet Eden" showBack />
      <View style={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        {loading ? (
          <Text secondary variant="body">
            Yükleniyor…
          </Text>
        ) : !progress.hasInviter ? (
          <GlassCard style={styles.card}>
            <Ionicons name="gift-outline" size={32} color={colors.primary} />
            <Text variant="label">Davet kodun var mı?</Text>
            <Text variant="caption" secondary>
              Kayıt sonrası yalnızca bir kez girebilirsin. İlişki değiştirilemez.
            </Text>
            <Input
              label="Davet kodu"
              value={codeInput}
              onChangeText={(v) => {
                setCodeInput(v.toUpperCase());
                setError(null);
              }}
              placeholder="DAVET-XXXX-XXXX"
              autoCapitalize="characters"
            />
            {error ? (
              <Text variant="caption" style={{ color: colors.error }}>
                {error}
              </Text>
            ) : null}
            <Button title="Davet Kodunu Kaydet" onPress={() => void handleSubmit()} loading={submitting} />
          </GlassCard>
        ) : (
          <>
            <GlassCard style={styles.card}>
              <Text variant="caption" secondary>
                Seni davet eden
              </Text>
              <View style={styles.inviterRow}>
                {progress.inviterAvatar ? (
                  <Image source={{ uri: progress.inviterAvatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: colors.surfaceElevated }]} />
                )}
                <View style={styles.inviterText}>
                  <Text variant="label">{progress.inviterFullName ?? progress.inviterUsername}</Text>
                  <Text variant="caption" muted>
                    @{progress.inviterUsername}
                  </Text>
                </View>
                <Button
                  title="Profil"
                  variant="ghost"
                  onPress={() => router.push(`/user/${progress.inviterId}` as never)}
                />
              </View>
              <Text variant="caption" secondary>
                Kod: {progress.inviteCode} · Kayıt:{' '}
                {progress.registeredAt
                  ? new Date(progress.registeredAt).toLocaleDateString('tr-TR')
                  : '—'}
              </Text>
              {progress.commissionStatus ? (
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: `${REFERRAL_STATUS_COLORS[progress.commissionStatus]}22`,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{ color: REFERRAL_STATUS_COLORS[progress.commissionStatus] }}
                  >
                    {REFERRAL_STATUS_LABELS[progress.commissionStatus]}
                  </Text>
                </View>
              ) : null}
            </GlassCard>

            <GlassCard style={styles.card}>
              <Text variant="label">İlerleme %{progress.progressPercent ?? 0}</Text>
              {settings ? (
                <View style={styles.progressList}>
                  <ReferralProgressBar
                    label="Üyelik Günü"
                    current={eval_?.membershipDays ?? 0}
                    target={settings.minDays}
                    unit=" gün"
                  />
                  <ReferralProgressBar
                    label="Aktif Süre"
                    current={eval_?.activeMinutes ?? 0}
                    target={settings.minActiveMinutes}
                    unit=" dk"
                  />
                  <ReferralProgressBar
                    label="Paylaşım"
                    current={eval_?.sharesCount ?? 0}
                    target={settings.minShares}
                  />
                  <ReferralProgressBar
                    label="Etkileşim"
                    current={eval_?.interactionsCount ?? 0}
                    target={settings.minInteractions}
                  />
                </View>
              ) : null}
            </GlassCard>

            <GlassCard style={styles.card}>
              <Text variant="label">Tamamlanan görevler</Text>
              <TaskLine done={eval_?.daysMet} label="Üyelik süresi" />
              <TaskLine done={eval_?.minutesMet} label="Aktif kullanım" />
              <TaskLine done={eval_?.sharesMet} label="Paylaşım" />
              <TaskLine done={eval_?.interactionsMet} label="Etkileşim" />
              <TaskLine done={eval_?.accountOk} label="Hesap aktif" />
              <TaskLine done={eval_?.spamOk} label="Spam cezası yok" />
            </GlassCard>
          </>
        )}
      </View>
    </GradientBackground>
  );
}

function TaskLine({ done, label }: { done?: boolean; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.taskLine}>
      <Ionicons
        name={done ? 'checkmark-circle' : 'ellipse-outline'}
        size={18}
        color={done ? colors.success : colors.textMuted}
      />
      <Text variant="caption" style={{ color: done ? colors.success : colors.textMuted }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: spacing.md, gap: spacing.md },
  card: { gap: spacing.sm },
  inviterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 48, height: 48, borderRadius: radius.full },
  inviterText: { flex: 1, gap: 2 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  progressList: { gap: spacing.sm, marginTop: spacing.xs },
  taskLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
