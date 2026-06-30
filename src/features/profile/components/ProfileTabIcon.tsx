import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { sanitizeAvatarUrl } from '@/features/account-deletion/utils';
import { useTheme } from '@/providers/ThemeProvider';

type ProfileTabIconProps = {
  avatarUrl: string | null;
  username: string;
  color: string;
  size?: number;
  focused?: boolean;
};

export function ProfileTabIcon({
  avatarUrl,
  username,
  color,
  size = 26,
  focused = false,
}: ProfileTabIconProps) {
  const { colors } = useTheme();
  const sanitizedUrl = sanitizeAvatarUrl(avatarUrl);
  const initial = username.slice(0, 1).toUpperCase();

  return (
    <View
      style={[
        styles.wrapper,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: focused ? 2 : 1.5,
          borderColor: focused ? color : colors.textMuted,
        },
      ]}
    >
      {sanitizedUrl ? (
        <Image source={{ uri: sanitizedUrl }} style={styles.image} />
      ) : username ? (
        <View style={[styles.placeholder, { backgroundColor: `${colors.primary}18` }]}>
          <Text variant="caption" style={[styles.initial, { color: colors.primary }]}>
            {initial}
          </Text>
        </View>
      ) : (
        <View style={[styles.placeholder, { backgroundColor: colors.surfaceElevated }]}>
          <Ionicons name="person-outline" size={size * 0.5} color={color} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
});
