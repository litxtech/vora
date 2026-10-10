import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { UserIdentity } from '@supabase/supabase-js';
import { Text } from '@/components/ui/Text';
import { EditProfileSection } from '@/features/profile/components/EditProfileSection';
import {
  fetchLinkedLoginState,
  linkAppleAccount,
  linkSocialAccount,
  unlinkSocialAccount,
  type LinkedLoginState,
} from '@/features/auth/services/linkedAccounts';
import { loginProviderLabel, type LinkableProviderId } from '@/features/auth/services/linkedLoginMethods';
import type { SocialAuthProvider } from '@/features/auth/services/oauthSignIn';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type LinkedAccountsSectionProps = {
  isGuest: boolean;
  onChanged?: () => void;
};

const PROVIDERS: {
  id: LinkableProviderId;
  featureId: string;
  icon: keyof typeof Ionicons.glyphMap;
  oauth: SocialAuthProvider | null;
}[] = [
  { id: 'google', featureId: 'google-sign-in', icon: 'logo-google', oauth: 'google' },
  { id: 'x', featureId: 'x-sign-in', icon: 'logo-x', oauth: 'x' },
  { id: 'twitch', featureId: 'twitch-sign-in', icon: 'logo-twitch', oauth: 'twitch' },
  { id: 'apple', featureId: 'apple-sign-in', icon: 'logo-apple', oauth: null },
];

export function LinkedAccountsSection({ isGuest, onChanged }: LinkedAccountsSectionProps) {
  const { colors, isDark } = useTheme();
  const showGoogle = useFeatureVisible('google-sign-in');
  const showX = useFeatureVisible('x-sign-in');
  const showTwitch = useFeatureVisible('twitch-sign-in');
  const showApple = useFeatureVisible('apple-sign-in');
  const visibleById: Record<LinkableProviderId, boolean> = {
    google: showGoogle,
    x: showX,
    twitch: showTwitch,
    apple: showApple,
  };
  const [state, setState] = useState<LinkedLoginState | null>(null);
  const [busyProvider, setBusyProvider] = useState<LinkableProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const providers = PROVIDERS.map((item) => item.id);
    const result = await fetchLinkedLoginState(providers);
    if (result.error) {
      setError(result.error);
      return;
    }
    setState(result.state);
  }, []);

  useEffect(() => {
    if (isGuest) return;
    void reload();
  }, [isGuest, reload]);

  if (isGuest) return null;

  const rows = (state?.rows ?? []).filter((row) => {
    if (row.provider === 'apple' && Platform.OS !== 'ios' && !row.linked) return false;
    return row.linked || visibleById[row.provider];
  });
  const verifiedText = state?.verifiedLabels.length
    ? `Doğrulanmış giriş: ${state.verifiedLabels.join(', ')}`
    : 'Doğrulanmış giriş yöntemi yok.';

  const runLink = async (provider: LinkableProviderId) => {
    setBusyProvider(provider);
    setError(null);
    const result =
      provider === 'apple' ? await linkAppleAccount() : await linkSocialAccount(provider as SocialAuthProvider);
    setBusyProvider(null);
    if (!result.ok && result.cancelled) return;
    if (!result.ok) {
      if (result.error) setError(result.error);
      return;
    }
    if (result.pending) return;
    await reload();
    onChanged?.();
    Alert.alert('Bağlandı', `${loginProviderLabel(provider)} hesabı bu profile bağlandı.`);
  };

  const runUnlink = (provider: LinkableProviderId, identity: UserIdentity) => {
    const row = state?.rows.find((item) => item.provider === provider);
    if (!row?.canUnlink || !state) {
      Alert.alert('Bağlantı kaldırılamaz', 'Hesabınızda en az bir doğrulanmış giriş yöntemi kalmalıdır. Önce başka bir uygulama bağlayın veya e-postanızı doğrulayın.');
      return;
    }

    Alert.alert(
      'Bağlantıyı kes',
      `${loginProviderLabel(provider)} bağlantısı kaldırılacak. Bu uygulama ile giriş yapamazsınız.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Bağlantıyı kes',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusyProvider(provider);
              setError(null);
              const result = await unlinkSocialAccount(identity, state.identities, state.context);
              setBusyProvider(null);
              if (!result.ok) {
                if (result.error) setError(result.error);
                return;
              }
              await reload();
              onChanged?.();
            })();
          },
        },
      ],
    );
  };

  return (
    <EditProfileSection icon="link-outline" title="Bağlı hesaplar">
      <Text secondary variant="caption" style={styles.hint}>
        Kayıt olduğunuz uygulama burada görünür. Diğer uygulamaları da bağlayabilirsiniz. Bağlantıyı kesmek için
        hesabınızda en az bir doğrulanmış giriş yöntemi kalmalıdır.
      </Text>
      <Text variant="caption" style={{ color: colors.text }}>
        {verifiedText}
      </Text>

      {rows.map((row) => {
        const meta = PROVIDERS.find((item) => item.id === row.provider);
        if (!meta) return null;
        const identity = state?.identities.find((item) => item.identity_id === row.identityId) ?? null;
        const loading = busyProvider === row.provider;
        const canConnect = row.provider !== 'apple' || Platform.OS === 'ios';

        return (
          <View
            key={row.provider}
            style={[
              styles.row,
              {
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : colors.border,
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.background,
              },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.surface }]}>
              <Ionicons name={meta.icon} size={18} color={colors.text} />
            </View>
            <View style={styles.copy}>
              <Text variant="label">{loginProviderLabel(row.provider)}</Text>
              <Text variant="caption" secondary>
                {loading
                  ? 'İşleniyor...'
                  : row.linked
                    ? row.detail ?? 'Bağlı'
                    : 'Bağlı değil'}
              </Text>
            </View>
            {row.linked && identity ? (
              <Pressable
                onPress={() => runUnlink(row.provider, identity)}
                disabled={Boolean(busyProvider)}
                accessibilityRole="button"
                accessibilityLabel={`${loginProviderLabel(row.provider)} bağlantısını kes`}
                style={({ pressed }) => [styles.action, pressed && styles.pressed]}
              >
                <Text variant="caption" style={{ color: row.canUnlink ? colors.danger : colors.textMuted }}>
                  {row.canUnlink ? 'Bağlantıyı kes' : 'Son giriş'}
                </Text>
              </Pressable>
            ) : canConnect ? (
              <Pressable
                onPress={() => void runLink(row.provider)}
                disabled={Boolean(busyProvider)}
                accessibilityRole="button"
                accessibilityLabel={`${loginProviderLabel(row.provider)} hesabını bağla`}
                style={({ pressed }) => [styles.action, pressed && styles.pressed]}
              >
                <Text variant="caption" style={{ color: colors.primary }}>
                  Bağla
                </Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}

      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
    </EditProfileSection>
  );
}

const styles = StyleSheet.create({
  hint: {
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  action: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
});
