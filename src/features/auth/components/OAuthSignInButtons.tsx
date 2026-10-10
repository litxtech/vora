import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import type { SocialAuthProvider } from '@/features/auth/services/oauthSignIn';
import { radius } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type OAuthSignInButtonsProps = {
  disabled?: boolean;
  loadingProvider?: SocialAuthProvider | null;
  showGoogle?: boolean;
  showX?: boolean;
  showTwitch?: boolean;
  onGoogle?: () => void;
  onX?: () => void;
  onTwitch?: () => void;
};

type ButtonStyle = {
  backgroundColor: string;
  color: string;
  borderColor: string;
};

function googleStyle(isDark: boolean): ButtonStyle {
  return {
    backgroundColor: isDark ? '#F8FAFC' : '#FFFFFF',
    color: '#1F1F1F',
    borderColor: isDark ? '#E2E8F0' : '#DADCE0',
  };
}

function xStyle(isDark: boolean): ButtonStyle {
  return isDark
    ? { backgroundColor: '#F8FAFC', color: '#0F1419', borderColor: '#E2E8F0' }
    : { backgroundColor: '#0F1419', color: '#FFFFFF', borderColor: '#0F1419' };
}

function twitchStyle(): ButtonStyle {
  return { backgroundColor: '#9146FF', color: '#FFFFFF', borderColor: '#9146FF' };
}

function SocialButton({
  label,
  icon,
  iconColor,
  appearance,
  loading,
  disabled,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  appearance: ButtonStyle;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: appearance.backgroundColor,
          borderColor: appearance.borderColor,
          opacity: isDisabled ? 0.65 : pressed ? 0.9 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={appearance.color} />
      ) : (
        <View style={styles.content}>
          <Ionicons name={icon} size={20} color={iconColor} />
          <Text variant="label" style={[styles.label, { color: appearance.color }]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function OAuthSignInButtons({
  disabled = false,
  loadingProvider = null,
  showGoogle = false,
  showX = false,
  showTwitch = false,
  onGoogle,
  onX,
  onTwitch,
}: OAuthSignInButtonsProps) {
  const { isDark } = useTheme();
  const busy = Boolean(loadingProvider);

  return (
    <View style={styles.stack}>
      {showGoogle && onGoogle ? (
        <SocialButton
          label="Google ile Devam Et"
          icon="logo-google"
          iconColor="#4285F4"
          appearance={googleStyle(isDark)}
          loading={loadingProvider === 'google'}
          disabled={disabled || (busy && loadingProvider !== 'google')}
          onPress={onGoogle}
        />
      ) : null}
      {showX && onX ? (
        <SocialButton
          label="X ile Devam Et"
          icon="logo-x"
          iconColor={xStyle(isDark).color}
          appearance={xStyle(isDark)}
          loading={loadingProvider === 'x'}
          disabled={disabled || (busy && loadingProvider !== 'x')}
          onPress={onX}
        />
      ) : null}
      {showTwitch && onTwitch ? (
        <SocialButton
          label="Twitch ile Devam Et"
          icon="logo-twitch"
          iconColor="#FFFFFF"
          appearance={twitchStyle()}
          loading={loadingProvider === 'twitch'}
          disabled={disabled || (busy && loadingProvider !== 'twitch')}
          onPress={onTwitch}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    width: '100%',
    gap: 10,
  },
  button: {
    width: '100%',
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: {
    fontWeight: '600',
  },
});
