import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AppleSignInButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

/**
 * iOS Apple giriş butonu — özel Pressable kullanır.
 * AppleAuthenticationButton native view'ı dev client yenilenmeden
 * "Unimplemented ViewManagerAdapter ExpoAppleAuthentication" verebilir;
 * signInAsync akışı bu butonla sorunsuz çalışır.
 */
export function AppleSignInButton({ onPress, disabled = false, loading = false }: AppleSignInButtonProps) {
  const { isDark } = useTheme();

  if (Platform.OS !== 'ios') return null;

  const isDisabled = disabled || loading;
  const bg = isDark ? '#FFFFFF' : '#000000';
  const fg = isDark ? '#000000' : '#FFFFFF';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel="Apple ile devam et"
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          opacity: isDisabled ? 0.65 : pressed ? 0.88 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.content}>
          <Ionicons name="logo-apple" size={20} color={fg} />
          <Text variant="label" style={[styles.label, { color: fg }]}>
            Apple ile Devam Et
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    minHeight: 52,
    borderRadius: radius.md,
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
