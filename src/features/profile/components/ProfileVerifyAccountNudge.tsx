import { Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const IDENTITY_VERIFICATION_ROUTE = '/settings/identity-verification';

export function ProfileVerifyAccountNudge() {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => router.push(IDENTITY_VERIFICATION_ROUTE as Href)}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: `${colors.primary}0C`,
          borderColor: `${colors.primary}28`,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
        <Ionicons name="shield-checkmark-outline" size={15} color={colors.primary} />
      </View>

      <View style={styles.copy}>
        <Text variant="caption" style={[styles.title, { color: colors.text }]}>
          Hesabını doğrula
        </Text>
        <Text variant="caption" secondary style={styles.subtitle} numberOfLines={2}>
          Onay rozeti ve güven puanı kazan
        </Text>
      </View>

      <View style={[styles.cta, { backgroundColor: colors.primary }]}>
        <Text variant="caption" style={styles.ctaText}>
          Doğrula
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.xs,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  title: {
    fontWeight: '700',
    fontSize: 12,
    lineHeight: 16,
  },
  subtitle: {
    fontSize: 10,
    lineHeight: 13,
  },
  cta: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  ctaText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
});
