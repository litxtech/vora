import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { formatDeletedAccountDate } from '@/features/account-deletion/utils';
import { formatPointsBalance, WALLET_ROUTE } from '@/features/wallet/constants';
import { fetchTrustScoreSummary } from '@/features/wallet/services/trustScoreData';
import { markNotificationClicked } from '@/features/notifications/services/notificationData';
import { fetchNotificationById } from '@/features/notifications/services/notificationDetail';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

function formatPlatformDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AccountNoticeScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const { notificationId } = useLocalSearchParams<{ notificationId?: string }>();
  const [trustScore, setTrustScore] = useState(0);
  const [noticeBody, setNoticeBody] = useState<string | null>(null);
  const [reactivatedAt, setReactivatedAt] = useState<string | null>(null);
  const [marked, setMarked] = useState(false);

  const profileCreatedAt = profile?.created_at ?? null;

  const load = useCallback(async () => {
    if (profile?.id) {
      const summary = await fetchTrustScoreSummary(profile.id);
      setTrustScore(summary.balance);
    }

    if (notificationId) {
      const notification = await fetchNotificationById(notificationId);
      if (notification) {
        setNoticeBody(notification.body);
        const data = notification.data ?? {};
        setReactivatedAt(
          (data.reactivated_at as string | undefined) ??
            notification.createdAt ??
            null,
        );
        if (!marked) {
          await markNotificationClicked(notificationId);
          setMarked(true);
        }
      }
    }
  }, [notificationId, profile?.id, marked]);

  useEffect(() => {
    void load();
  }, [load]);

  const platformOpenedLabel = useMemo(
    () => formatPlatformDateTime(profileCreatedAt),
    [profileCreatedAt],
  );
  const reactivatedLabel = useMemo(
    () => formatPlatformDateTime(reactivatedAt ?? new Date().toISOString()),
    [reactivatedAt],
  );

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <AuthHeader title="Hesap Bildirimi" subtitle="Platform hesap durumu" showBack />

        <GlassCard style={styles.heroCard}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.success}18` }]}>
            <Ionicons name="checkmark-circle" size={32} color={colors.success} />
          </View>
          <Text variant="h3" style={{ textAlign: 'center' }}>
            Hesabınız aktif edildi
          </Text>
          {noticeBody ? (
            <Text secondary variant="body" style={{ textAlign: 'center' }}>
              {noticeBody}
            </Text>
          ) : null}
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text variant="label">Hesap bilgileri</Text>
          <InfoRow
            icon="calendar-outline"
            label="Platforma kayıt"
            value={platformOpenedLabel}
            highlight={colors.primary}
          />
          <InfoRow
            icon="refresh-outline"
            label="Hesap yeniden açıldı"
            value={reactivatedLabel}
            highlight={colors.success}
          />
          <InfoRow
            icon="person-outline"
            label="Kullanıcı"
            value={profile?.username ? `@${profile.username}` : '—'}
          />
        </GlassCard>

        <GlassCard style={[styles.card, { borderColor: `${colors.primary}44`, borderWidth: 1 }]}>
            <View style={styles.balanceRow}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text variant="label">Güven puanınız</Text>
                <Text variant="caption" secondary>
                  {formatPointsBalance(trustScore, 100)} — puan hareketlerinizi cüzdandan takip edebilirsiniz.
                </Text>
              </View>
            </View>
            <Button title="Cüzdana Git" variant="outline" onPress={() => router.push(WALLET_ROUTE as never)} />
          </GlassCard>

        <GlassCard style={styles.card}>
          <Text variant="label">Hesabınızla ilgili sorun mu var?</Text>
          <Text secondary variant="caption">
            Erişim, bakiye veya hesap durumu ile ilgili destek ekibimize yazabilirsiniz. Talebinizin her
            aşamasında bildirim alırsınız.
          </Text>
          <Button
            title="Destek Merkezi"
            onPress={() =>
              router.push({
                pathname: '/support/create',
                params: { category: 'account', subject: 'Hesap durumu hakkında destek' },
              } as never)
            }
          />
        </GlassCard>

        <Button title="Tamam" variant="secondary" onPress={() => router.back()} />
      </ScrollView>
    </GradientBackground>
  );
}

type InfoRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  highlight?: string;
};

function InfoRow({ icon, label, value, highlight }: InfoRowProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.infoRow, { borderColor: colors.border, backgroundColor: `${colors.primary}06` }]}>
      <Ionicons name={icon} size={16} color={highlight ?? colors.textMuted} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="caption" muted>
          {label}
        </Text>
        <Text variant="body" style={{ color: highlight ?? colors.text, fontWeight: highlight ? '600' : '400' }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  heroCard: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
});
