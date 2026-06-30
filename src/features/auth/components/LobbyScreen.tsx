import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { LEGAL_DOCUMENTS } from '@/constants/legal';
import { APP_ICON, APP_NAME } from '@/constants/branding';
import { radius, spacing } from '@/constants/theme';
import { LobbyWelcomeCard } from '@/features/auth/components/LobbyWelcomeCard';
import { LobbyDeveloperFeedbackSheet } from '@/features/auth/components/LobbyDeveloperFeedbackSheet';
import { isAppleSignInAvailable, signInWithApple } from '@/features/auth/services/appleSignIn';
import {
  clearLoginAttempts,
  getLoginLockoutMessage,
  recordFailedLogin,
} from '@/features/auth/services/loginAttempts';
import { navigateAfterSuccessfulLogin } from '@/features/auth/services/postLoginNavigation';
import { clearSkipAutoGuest } from '@/features/auth/services/sessionPolicy';
import { signInWithIdentifier } from '@/features/auth/services/usernameLogin';
import {
  normalizeLoginIdentifierInput,
} from '@/features/auth/services/validation';
import type { SavedLoginAccount } from '@/features/auth/types/savedLoginAccounts';
import { LobbyAnnouncementBanner } from '@/features/app-appearance/components/LobbyAnnouncementBanner';
import { TrustVacationPromoSlot } from '@/features/trust-promo';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { AUTH_FEATURE } from '@/features/auth/featureFlags';
import { supabase } from '@/lib/supabase/client';
import { useAppearance } from '@/providers/AppearanceProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function LobbyScreen() {
  const { colors } = useTheme();
  const { config: appearance } = useAppearance();
  const lobby = appearance.lobby;
  const insets = useSafeAreaInsets();
  const { enterGuestMode, savedLoginAccounts, rememberLoginAccountAfterSuccess, forgetLoginAccount } = useAuth();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [manualEntry, setManualEntry] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showAppleFeature = useFeatureVisible('apple-sign-in');
  const showLobbyFeedback = useFeatureVisible(AUTH_FEATURE.lobbyFeedback);

  useEffect(() => {
    if (savedLoginAccounts.length === 0) {
      setManualEntry(true);
      return;
    }
    setManualEntry(false);
    setLoginId((current) => current || savedLoginAccounts[0]!.loginId);
  }, [savedLoginAccounts]);

  const handleLoginIdChange = (value: string) => {
    setLoginId(normalizeLoginIdentifierInput(value));
  };

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setAppleAvailable(false);
      return;
    }
    void isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  const canUseAppleSignIn = showAppleFeature && appleAvailable;

  const openLegal = (slug: string) => {
    router.push({ pathname: '/(auth)/legal', params: { slug } });
  };

  const handleSelectAccount = (account: SavedLoginAccount) => {
    setManualEntry(false);
    setLoginId(account.loginId);
    setPassword('');
    setError(null);
  };

  const handleUseManualEntry = () => {
    setManualEntry(true);
    setLoginId('');
    setPassword('');
    setError(null);
  };

  const handleShowSavedAccounts = () => {
    setManualEntry(false);
    setLoginId('');
    setPassword('');
    setError(null);
  };

  const handleForgetAccount = async (accountLoginId: string) => {
    await forgetLoginAccount(accountLoginId);
    setPassword('');
    setError(null);
    const remaining = savedLoginAccounts.filter((item) => item.loginId !== accountLoginId);
    if (remaining.length === 0) {
      setManualEntry(true);
      setLoginId('');
      return;
    }
    setManualEntry(false);
    setLoginId(remaining[0]!.loginId);
  };

  const handleLogin = async () => {
    const lockout = await getLoginLockoutMessage();
    if (lockout) {
      setError(lockout);
      return;
    }

    setLoginLoading(true);
    setError(null);

    const { error: authError } = await signInWithIdentifier(loginId, password);

    setLoginLoading(false);

    if (authError) {
      if (authError.includes('hatalı')) {
        const lockoutMessage = await recordFailedLogin();
        setError(lockoutMessage ?? authError);
      } else {
        setError(authError);
      }
      return;
    }

    await clearLoginAttempts();
    await clearSkipAutoGuest();

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setError('Oturum oluşturulamadı.');
      return;
    }

    await rememberLoginAccountAfterSuccess(loginId, userData.user.id);
    await navigateAfterSuccessfulLogin(userData.user.id);
  };

  const continueAsGuest = async () => {
    setGuestLoading(true);
    setError(null);

    const { error: guestError } = await enterGuestMode();
    setGuestLoading(false);

    if (guestError) {
      setError(guestError);
      return;
    }

    await clearSkipAutoGuest();
    router.replace('/(tabs)');
  };

  const continueWithApple = async () => {
    setAppleLoading(true);
    setError(null);

    const result = await signInWithApple();
    setAppleLoading(false);

    if (!result.ok && result.cancelled) return;
    if (!result.ok && result.review) return;

    if (!result.ok) {
      if (result.error) setError(result.error);
      return;
    }

    router.replace(result.destination);
  };

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + spacing.xl,
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Image
            source={
              appearance.branding.lobby_icon_url
                ? { uri: appearance.branding.lobby_icon_url }
                : APP_ICON
            }
            style={styles.appIcon}
            accessibilityLabel={`${APP_NAME} uygulama simgesi`}
          />
          <Text style={[styles.brandTitle, { color: colors.text }]}>{APP_NAME}</Text>
          <Text secondary style={styles.tagline}>
            {lobby.tagline}
          </Text>
        </View>

        <LobbyAnnouncementBanner announcements={lobby.announcements} />

        <TrustVacationPromoSlot placement="lobby" compact />

        <LobbyWelcomeCard
          welcomeTitle={lobby.welcome_title}
          welcomeSubtitle={lobby.welcome_subtitle}
          savedAccounts={savedLoginAccounts}
          loginId={loginId}
          password={password}
          manualEntry={manualEntry}
          loginLoading={loginLoading}
          guestLoading={guestLoading}
          appleLoading={appleLoading}
          error={error}
          onLoginIdChange={handleLoginIdChange}
          onPasswordChange={setPassword}
          onSelectAccount={handleSelectAccount}
          onUseManualEntry={handleUseManualEntry}
          onShowSavedAccounts={handleShowSavedAccounts}
          onForgetAccount={handleForgetAccount}
          onSubmitLogin={handleLogin}
          onLoginWithCode={() => router.push('/(auth)/login-code')}
          onRegister={() => router.push('/(auth)/register')}
          onGuest={continueAsGuest}
          onForgotPassword={() => router.push('/(auth)/forgot-password')}
          onAppleSignIn={canUseAppleSignIn ? continueWithApple : undefined}
        />

        <View style={styles.legal}>
          <Pressable onPress={() => openLegal('terms')}>
            <Text variant="caption" style={{ color: colors.textMuted }}>
              {LEGAL_DOCUMENTS.terms.title}
            </Text>
          </Pressable>
          <Text variant="caption" muted>
            •
          </Text>
          <Pressable onPress={() => openLegal('privacy')}>
            <Text variant="caption" style={{ color: colors.textMuted }}>
              {LEGAL_DOCUMENTS.privacy.title}
            </Text>
          </Pressable>
          <Text variant="caption" muted>
            •
          </Text>
          <Pressable onPress={() => openLegal('child_protection')}>
            <Text variant="caption" style={{ color: colors.textMuted }}>
              {LEGAL_DOCUMENTS.child_protection.title}
            </Text>
          </Pressable>
        </View>

        {showLobbyFeedback ? (
          <Pressable
            onPress={() => setFeedbackOpen(true)}
            style={({ pressed }) => [styles.feedbackLink, pressed && styles.feedbackLinkPressed]}
            accessibilityRole="button"
            accessibilityLabel="Geliştiriciye öneri veya destek gönder"
          >
            <Ionicons name="chatbox-ellipses-outline" size={14} color={colors.textMuted} />
            <Text variant="caption" style={{ color: colors.textMuted }}>
              Geliştiriciye öneri / destek
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <LobbyDeveloperFeedbackSheet visible={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  appIcon: {
    width: 88,
    height: 88,
    borderRadius: radius.xl,
    marginBottom: spacing.xs,
  },
  brandTitle: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: 6,
    lineHeight: 48,
  },
  tagline: {
    textAlign: 'center',
    maxWidth: 260,
  },
  legal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  feedbackLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  feedbackLinkPressed: {
    opacity: 0.65,
  },
});
