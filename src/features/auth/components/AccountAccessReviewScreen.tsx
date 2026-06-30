import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { SUPPORT_EMAIL } from '@/constants/legal';
import { radius, spacing } from '@/constants/theme';
import { AccountLifecycleRequestPanel } from '@/features/account-lifecycle/components/AccountLifecycleRequestPanel';
import { cancelAccountDeletionRpc } from '@/features/account-deletion/services/accountDeletion';
import {
  accountAccessReviewDescription,
  accountAccessReviewTitle,
  buildAccountAccessInfoRows,
  formatRemainingDuration,
} from '@/features/auth/services/accountAccessReview';
import { clearAccountAccessReviewActive } from '@/features/auth/services/accountAccessReviewStore';
import { clearAuthRoutingCache } from '@/features/auth/services/postLoginNavigation';
import { markSignOutReason, markSkipAutoGuest, type SessionEndReason } from '@/features/auth/services/sessionPolicy';
import type { AccountAccessReviewPayload } from '@/features/auth/types/accountAccessReview';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type AccountAccessReviewScreenProps = {
  payload: AccountAccessReviewPayload;
};

export function AccountAccessReviewScreen({ payload }: AccountAccessReviewScreenProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { signOut, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const infoRows = useMemo(() => buildAccountAccessInfoRows(payload), [payload]);
  const title = accountAccessReviewTitle(payload.scenario);
  const description = accountAccessReviewDescription(payload.scenario);

  const iconName =
    payload.scenario === 'deletion_pending'
      ? 'time-outline'
      : payload.scenario === 'deleted'
        ? 'trash-outline'
        : payload.scenario === 'frozen'
          ? 'snow-outline'
          : 'shield-outline';

  const accentColor =
    payload.scenario === 'deletion_pending'
      ? colors.warning
      : payload.scenario === 'deleted' || payload.scenario === 'banned'
        ? colors.danger
        : colors.primary;

  const resolveSignOutReason = (): SessionEndReason => {
    if (payload.scenario === 'frozen') return 'frozen';
    if (payload.scenario === 'deleted') return 'deleted';
    if (payload.scenario === 'banned') return 'ban';
    return 'manual';
  };

  const returnToLobby = async () => {
    setLoading(true);
    await markSignOutReason(resolveSignOutReason());
    await markSkipAutoGuest();
    await signOut(resolveSignOutReason());
    await clearAuthRoutingCache();
    clearAccountAccessReviewActive();
    setLoading(false);
    router.replace('/(welcome)/lobby');
  };

  const handleCancelDeletion = async () => {
    setLoading(true);
    const { error } = await cancelAccountDeletionRpc();
    if (error) {
      setLoading(false);
      Alert.alert('Hata', error);
      return;
    }

    await refreshProfile();
    clearAccountAccessReviewActive();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setLoading(false);

    if (!user) {
      router.replace('/(welcome)/lobby');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .maybeSingle();

    router.replace(
      profile?.onboarding_completed === false ? '/(onboarding)/profile-setup' : '/(tabs)',
    );
  };

  return (
    <GradientBackground>
      <BlurView intensity={isDark ? 48 : 32} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View
        style={[
          styles.dim,
          { backgroundColor: isDark ? 'rgba(10,14,20,0.72)' : 'rgba(15,23,42,0.55)' },
        ]}
      />

      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxl * 2 },
        ]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={32}
        extraKeyboardSpace={24}
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader title={title} subtitle={description} showBack={false} />

        <GlassCard style={styles.heroCard}>
          <View style={[styles.iconWrap, { backgroundColor: `${accentColor}18` }]}>
            <Ionicons name={iconName} size={28} color={accentColor} />
          </View>

          {payload.scenario === 'deletion_pending' && payload.remainingMs != null ? (
            <View
              style={[
                styles.countdownBox,
                { borderColor: `${colors.warning}44`, backgroundColor: `${colors.warning}12` },
              ]}
            >
              <Text variant="caption" style={{ color: colors.warning, fontWeight: '700' }}>
                Kalan süre
              </Text>
              <Text variant="h2" style={{ color: colors.warning }}>
                {formatRemainingDuration(payload.remainingMs)}
              </Text>
              <Text variant="caption" secondary>
                Süre dolduğunda tüm verileriniz kalıcı olarak silinir
              </Text>
            </View>
          ) : null}

          <View style={styles.infoList}>
            {infoRows.map((row) => (
              <View
                key={row.label}
                style={[
                  styles.infoRow,
                  {
                    borderColor: row.highlight ? `${accentColor}33` : colors.border,
                    backgroundColor: row.highlight
                      ? `${accentColor}0D`
                      : isDark
                        ? 'rgba(255,255,255,0.03)'
                        : colors.background,
                  },
                ]}
              >
                <Text variant="caption" muted>
                  {row.label}
                </Text>
                <Text
                  variant="body"
                  style={{
                    color: row.highlight ? accentColor : colors.text,
                    fontWeight: row.highlight ? '600' : '400',
                  }}
                >
                  {row.value}
                </Text>
              </View>
            ))}
          </View>

          {payload.scenario === 'frozen' || payload.scenario === 'banned' ? (
            <Text variant="caption" secondary style={styles.support}>
              Hesabınızı yeniden açtırmak için {SUPPORT_EMAIL} adresine yazabilirsiniz.
            </Text>
          ) : null}
        </GlassCard>

        <AccountLifecycleRequestPanel scenario={payload.scenario} />

        <Button
          title="Destek Merkezi"
          variant="outline"
          onPress={() => router.push('/support-center' as never)}
        />

        <View style={styles.actions}>
          {payload.scenario === 'deletion_pending' && payload.keepSession ? (
            <>
              <Button
                title="Silme Talebini İptal Et ve Devam Et"
                loading={loading}
                onPress={handleCancelDeletion}
              />
              <Button title="Lobiye Dön" variant="secondary" loading={loading} onPress={returnToLobby} />
            </>
          ) : (
            <Button title="Lobiye Dön" loading={loading} onPress={returnToLobby} />
          )}
        </View>
      </KeyboardAwareScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  dim: {
    ...StyleSheet.absoluteFill,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  heroCard: {
    gap: spacing.md,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  countdownBox: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  infoList: {
    gap: spacing.sm,
  },
  infoRow: {
    gap: 4,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  support: {
    lineHeight: 18,
  },
  actions: {
    gap: spacing.sm,
  },
});
