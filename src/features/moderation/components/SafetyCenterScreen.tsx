import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import {
  ACCOUNT_STATUS_LABELS,
  REPORT_REASONS,
  REPORT_RESPONSE_NOTE,
  WARNING_LEVEL_LABELS,
} from '@/features/moderation/constants';
import {
  acknowledgeWarning,
  fetchSafetyCenter,
  fetchSafetyPreferences,
  revokeSession,
  updateSafetyPreferences,
} from '@/features/moderation/services/safetyCenter';
import type { SafetyCenterData, SafetyPreferences } from '@/features/moderation/types';
import { getTrustScoreColor } from '@/features/profile/constants';
import { REPORT_STATUS_LABELS } from '@/features/admin/constants';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function SafetyCenterScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [data, setData] = useState<SafetyCenterData | null>(null);
  const [prefs, setPrefs] = useState<SafetyPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [center, preferences] = await Promise.all([
      fetchSafetyCenter(user.id),
      fetchSafetyPreferences(user.id),
    ]);
    setData(center);
    setPrefs(preferences);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAcknowledge = (warningId: string) => {
    Alert.alert('Uyarıyı okudum', 'Bu uyarıyı okuduğunuzu onaylıyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: async () => {
          await acknowledgeWarning(warningId);
          load();
        },
      },
    ]);
  };

  const handleRevokeSession = (sessionId: string) => {
    Alert.alert('Oturumu Kapat', 'Bu cihazdaki oturum sonlandırılsın mı?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kapat',
        style: 'destructive',
        onPress: async () => {
          await revokeSession(sessionId);
          load();
        },
      },
    ]);
  };

  const togglePref = async (key: keyof SafetyPreferences, value: boolean) => {
    if (!user || !prefs) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    await updateSafetyPreferences(user.id, { [key]: value });
  };

  if (loading || !data || !prefs) {
    return (
      <GradientBackground>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </GradientBackground>
    );
  }

  const trustColor = getTrustScoreColor(data.trustScore);

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <AuthHeader
          title="Güven Merkezi"
          subtitle="Uyarılar, şikayet geçmişi ve hesap durumu"
        />

        <GlassCard style={styles.card}>
          <Text variant="label">Güven Puanı</Text>
          <Text variant="h2" style={{ color: trustColor }}>
            {data.trustScore}
          </Text>
          <Text secondary variant="caption">
            Kaliteli katkılar puanı artırır, ihlaller düşürür.
          </Text>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text variant="label">Hesap Durumu</Text>
          <View style={styles.row}>
            <Ionicons
              name={data.accountStatus === 'active' ? 'checkmark-circle' : 'alert-circle'}
              size={20}
              color={data.accountStatus === 'active' ? colors.success : colors.warning}
            />
            <Text>{ACCOUNT_STATUS_LABELS[data.accountStatus] ?? data.accountStatus}</Text>
          </View>
          <Text secondary variant="caption">
            {data.blockedCount} engellenen · {data.mutedCount} sessize alınan
          </Text>
        </GlassCard>

        {data.activeWarnings.length > 0 ? (
          <GlassCard style={styles.card}>
            <Text variant="label">Aktif Uyarılar</Text>
            {data.activeWarnings.map((w) => (
              <View key={w.id} style={[styles.warningRow, { borderColor: colors.border }]}>
                <View style={styles.warningInfo}>
                  <Text style={{ color: colors.warning }}>{WARNING_LEVEL_LABELS[w.level]}</Text>
                  <Text secondary variant="caption">{w.reason}</Text>
                </View>
                <Pressable onPress={() => handleAcknowledge(w.id)}>
                  <Text variant="caption" style={{ color: colors.primary }}>Okudum</Text>
                </Pressable>
              </View>
            ))}
          </GlassCard>
        ) : null}

        <GlassCard style={styles.card}>
          <Text variant="label">Hassas İçerik Tercihleri</Text>
          <View style={styles.prefRow}>
            <Text>Hassas içerikleri göster</Text>
            <Switch
              value={prefs.show_sensitive_content}
              onValueChange={(v) => togglePref('show_sensitive_content', v)}
              trackColor={{ true: colors.primary }}
            />
          </View>
          <View style={styles.prefRow}>
            <Text>Hassas içerikleri bulanıklaştır</Text>
            <Switch
              value={prefs.blur_sensitive_content}
              onValueChange={(v) => togglePref('blur_sensitive_content', v)}
              trackColor={{ true: colors.primary }}
            />
          </View>
        </GlassCard>

        {data.sessions.length > 0 ? (
          <GlassCard style={styles.card}>
            <Pressable
              style={styles.collapseHeader}
              onPress={() => setSessionsOpen((v) => !v)}
            >
              <View style={styles.collapseTitle}>
                <Text variant="label">Aktif Oturumlar</Text>
                <View style={[styles.countBadge, { backgroundColor: colors.border }]}>
                  <Text variant="caption">{data.sessions.length}</Text>
                </View>
              </View>
              <Ionicons
                name={sessionsOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textMuted}
              />
            </Pressable>
            {sessionsOpen
              ? data.sessions.map((s) => (
                  <View key={s.id} style={[styles.sessionRow, { borderColor: colors.border }]}>
                    <View>
                      <Text>{s.deviceName ?? 'Bilinmeyen cihaz'}</Text>
                      <Text secondary variant="caption">
                        {s.deviceType ?? 'cihaz'} · {new Date(s.lastActiveAt).toLocaleDateString('tr-TR')}
                        {s.isCurrent ? ' · Bu cihaz' : ''}
                      </Text>
                    </View>
                    {!s.isCurrent ? (
                      <Pressable onPress={() => handleRevokeSession(s.id)}>
                        <Text variant="caption" style={{ color: colors.danger }}>Kapat</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))
              : null}
          </GlassCard>
        ) : null}

        <GlassCard style={styles.card}>
          <Pressable
            style={styles.collapseHeader}
            onPress={() => setReportsOpen((v) => !v)}
          >
            <View style={styles.collapseTitle}>
              <Text variant="label">Şikayet Geçmişi</Text>
              {data.reportHistory.length > 0 ? (
                <View style={[styles.countBadge, { backgroundColor: colors.border }]}>
                  <Text variant="caption">{data.reportHistory.length}</Text>
                </View>
              ) : null}
            </View>
            <Ionicons
              name={reportsOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textMuted}
            />
          </Pressable>
          {reportsOpen ? (
            <>
              <Text secondary variant="caption">
                {REPORT_RESPONSE_NOTE}
              </Text>
              {data.reportHistory.length === 0 ? (
                <Text secondary>Henüz şikayet göndermediniz.</Text>
              ) : (
                data.reportHistory.map((r) => {
                  const reasonLabel = REPORT_REASONS.find((x) => x.id === r.reason)?.label ?? r.reason;
                  const statusLabel =
                    REPORT_STATUS_LABELS[r.status as keyof typeof REPORT_STATUS_LABELS] ?? r.status;
                  return (
                    <View key={r.id} style={[styles.reportRow, { borderColor: colors.border }]}>
                      <Text variant="caption">{reasonLabel}</Text>
                      <Text secondary variant="caption">
                        {r.targetType} · {statusLabel}
                      </Text>
                    </View>
                  );
                })
              )}
            </>
          ) : null}
        </GlassCard>

        <Pressable onPress={() => router.push('/settings/account' as never)}>
          <GlassCard style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
              <Text>Şifre ve hesap güvenliği</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={styles.chevron} />
            </View>
          </GlassCard>
        </Pressable>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  collapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collapseTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  countBadge: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: { marginLeft: 'auto' },
  warningRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  warningInfo: { flex: 1, gap: 2 },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reportRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
});
