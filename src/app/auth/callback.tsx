import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import {
  completeOAuthRedirect,
  establishOAuthSessionFromUrl,
  hasOAuthCallbackParams,
  isLinkOAuthCallback,
} from '@/features/auth/services/oauthSignIn';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export default function OAuthCallbackScreen() {
  const { colors } = useTheme();
  const [message, setMessage] = useState('Giriş tamamlanıyor...');

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      const initialUrl = await Linking.getInitialURL();
      const url =
        typeof window !== 'undefined' && window.location?.href
          ? window.location.href
          : initialUrl;

      if (!url || !hasOAuthCallbackParams(url)) {
        router.replace('/(welcome)/lobby');
        return;
      }

      if (isLinkOAuthCallback(url)) {
        const linked = await establishOAuthSessionFromUrl(url);
        if (cancelled) return;
        if (!linked.ok) {
          setMessage(linked.error);
          return;
        }
        router.replace('/profile/edit');
        return;
      }

      const result = await completeOAuthRedirect(url);
      if (cancelled) return;

      if (!result.ok) {
        if (result.cancelled || result.review) {
          if (!result.review) router.replace('/(welcome)/lobby');
          return;
        }
        setMessage(result.error ?? 'Giriş tamamlanamadı.');
        return;
      }

      if (result.pending) {
        router.replace('/(welcome)/lobby');
        return;
      }

      router.replace(result.destination);
    };

    void finish();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <GradientBackground>
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <Text secondary style={styles.message}>
          {message}
        </Text>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  message: {
    textAlign: 'center',
  },
});
