import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useAccountSwitch } from '@/features/account-switch/providers/AccountSwitchProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function AccountSwitchHint() {
  const { colors } = useTheme();
  const { canSwitch, actingAs, linkedSibling, isSwitching } = useAccountSwitch();

  if (!canSwitch) return null;

  const targetLabel = linkedSibling
    ? linkedSibling.fullName?.trim() || `@${linkedSibling.username}`
    : actingAs === 'personal'
      ? 'işletme'
      : 'bireysel';

  return (
    <Pressable disabled={isSwitching}>
      <GlassCard style={styles.card}>
        <Ionicons name="swap-horizontal" size={18} color={colors.primary} />
        <View style={styles.textWrap}>
          <Text variant="caption" style={{ fontWeight: '700' }}>
            Hesap değiştir
          </Text>
          <Text secondary variant="caption">
            Profil sekmesine iki kez dokunarak {targetLabel} hesabına geçin
          </Text>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  textWrap: { flex: 1, gap: 2 },
});
