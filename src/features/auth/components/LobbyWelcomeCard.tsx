import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { AppleSignInButton } from '@/features/auth/components/AppleSignInButton';
import { SavedLoginAccountsSection } from '@/features/auth/components/SavedLoginAccountsSection';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import type { SavedLoginAccount } from '@/features/auth/types/savedLoginAccounts';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type LobbyWelcomeCardProps = {
  welcomeTitle?: string;
  welcomeSubtitle?: string;
  savedAccounts: SavedLoginAccount[];
  loginId: string;
  password: string;
  manualEntry: boolean;
  loginLoading: boolean;
  guestLoading: boolean;
  appleLoading?: boolean;
  error: string | null;
  onLoginIdChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSelectAccount: (account: SavedLoginAccount) => void;
  onUseManualEntry: () => void;
  onShowSavedAccounts: () => void;
  onForgetAccount: (loginId: string) => void;
  onSubmitLogin: () => void;
  onLoginWithCode: () => void;
  onRegister: () => void;
  onGuest: () => void;
  onForgotPassword: () => void;
  onAppleSignIn?: () => void;
};

export function LobbyWelcomeCard({
  welcomeTitle = 'Hoş geldiniz',
  welcomeSubtitle = 'Hesabınıza giriş yapın',
  savedAccounts,
  loginId,
  password,
  manualEntry,
  loginLoading,
  guestLoading,
  appleLoading = false,
  error,
  onLoginIdChange,
  onPasswordChange,
  onSelectAccount,
  onUseManualEntry,
  onShowSavedAccounts,
  onForgetAccount,
  onSubmitLogin,
  onLoginWithCode,
  onRegister,
  onGuest,
  onForgotPassword,
  onAppleSignIn,
}: LobbyWelcomeCardProps) {
  const { colors, isDark } = useTheme();
  const showAppleFeature = useFeatureVisible('apple-sign-in');
  const showLogin = useFeatureVisible('auth-login');
  const showRegister = useFeatureVisible('auth-register');
  const showGuest = useFeatureVisible('auth-guest');
  const showForgotPassword = useFeatureVisible('auth-forgot-password');
  const showAppleSignIn = showAppleFeature && Platform.OS === 'ios' && Boolean(onAppleSignIn);

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border,
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.surface,
        },
      ]}
    >
      <View style={styles.header}>
        <Text variant="h2" style={styles.welcomeTitle}>
          {welcomeTitle}
        </Text>
        <Text secondary style={styles.welcomeSubtitle}>
          {welcomeSubtitle}
        </Text>
      </View>

      {showLogin ? (
        <View style={styles.form}>
          <SavedLoginAccountsSection
            savedAccounts={savedAccounts}
            loginId={loginId}
            password={password}
            manualEntry={manualEntry}
            loading={loginLoading}
            error={error}
            onLoginIdChange={onLoginIdChange}
            onPasswordChange={onPasswordChange}
            onSelectAccount={onSelectAccount}
            onUseManualEntry={onUseManualEntry}
            onShowSavedAccounts={onShowSavedAccounts}
            onForgetAccount={onForgetAccount}
            onSubmit={onSubmitLogin}
          />

          <View style={styles.footerLinks}>
            {showRegister ? (
              <Pressable onPress={onRegister} hitSlop={8}>
                <Text variant="caption" style={{ color: colors.primary }}>
                  Kayıt Ol
                </Text>
              </Pressable>
            ) : null}
            {showRegister && showForgotPassword ? (
              <Text variant="caption" muted>
                •
              </Text>
            ) : null}
            {showForgotPassword ? (
              <Pressable onPress={onForgotPassword} hitSlop={8}>
                <Text variant="caption" style={{ color: colors.primary }}>
                  Şifremi Unuttum
                </Text>
              </Pressable>
            ) : null}
            {(showRegister || showForgotPassword) && showLogin ? (
              <Text variant="caption" muted>
                •
              </Text>
            ) : null}
            {showLogin ? (
              <Pressable onPress={onLoginWithCode} hitSlop={8}>
                <Text variant="caption" style={{ color: colors.primary }}>
                  Kod ile Giriş
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {showAppleSignIn ? (
        <>
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border }]} />
            <Text variant="caption" muted>
              veya
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border }]} />
          </View>
          <AppleSignInButton
            onPress={onAppleSignIn!}
            disabled={guestLoading || loginLoading}
            loading={appleLoading}
          />
        </>
      ) : null}

      <View style={styles.accessCards}>
        {showGuest ? (
          <View style={styles.guestBlock}>
            <Pressable
              onPress={onGuest}
              disabled={guestLoading || loginLoading}
              style={({ pressed }) => [
                styles.accessCard,
                {
                  borderColor: isDark ? 'rgba(255,255,255,0.14)' : colors.border,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.background,
                  opacity: guestLoading || loginLoading ? 0.6 : pressed ? 0.9 : 1,
                },
              ]}
            >
              <View style={[styles.accessIconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.surface }]}>
                <Ionicons name="eye-outline" size={18} color={colors.textSecondary} />
              </View>
              <View style={styles.accessContent}>
                <Text variant="label" style={{ color: colors.textSecondary }}>
                  {guestLoading ? 'Açılıyor...' : 'Misafir Girişi'}
                </Text>
                <Text variant="caption" secondary>
                  Hesap oluşturmadan uygulamayı keşfedin.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
            <Text variant="caption" secondary style={styles.guestNotice}>
              Bilgi: Misafir hesap, uygulamayı denemeniz içindir. Bireysel hesaba geçişte veri aktarımı
              sınırlı olabilir veya ek adımlar gerekebilir.
              {showRegister ? (
                <>
                  {' '}
                  Kalıcı hesap için{' '}
                  <Text variant="caption" style={{ color: colors.primary }} onPress={onRegister}>
                    Kayıt Ol
                  </Text>{' '}
                  bölümünü kullanabilirsiniz.
                </>
              ) : (
                ' Kalıcı hesap için kayıt olmanızı öneririz.'
              )}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  welcomeTitle: {
    textAlign: 'center',
  },
  welcomeSubtitle: {
    textAlign: 'center',
    maxWidth: 280,
  },
  form: {
    gap: spacing.md,
  },
  footerLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  accessCards: {
    gap: spacing.sm,
  },
  guestBlock: {
    gap: spacing.xs,
  },
  guestNotice: {
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: spacing.xs,
  },
  accessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  accessIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessContent: {
    flex: 1,
    gap: 2,
  },
});
