import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  notifyAccountSwitchSuccess,
  notifyAccountSwitchUnavailable,
  linkedSiblingDisplayName,
} from '@/features/account-switch/services/accountSwitch';
import { useAccountSwitch } from '@/features/account-switch/providers/AccountSwitchProvider';
import { useAuth } from '@/providers/AuthProvider';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function ProfileAccountSwitchButton() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const { canSwitch, isSwitching, actingAs, linkedSibling, switchAccount, switchPreview } =
    useAccountSwitch();

  const accountType = profile?.account_type ?? 'personal';

  if (!canSwitch) return null;

  const targetShort = linkedSibling
    ? linkedSiblingDisplayName(linkedSibling)
    : switchPreview?.target.label ?? (actingAs === 'personal' ? 'İşletme' : 'Bireysel');

  const handlePress = async () => {
    if (!canSwitch) {
      notifyAccountSwitchUnavailable(accountType);
      return;
    }

    const { error } = await switchAccount();
    if (error) {
      Alert.alert('Hesap değişimi', error);
      return;
    }

    const label = linkedSibling ? linkedSiblingDisplayName(linkedSibling) : targetShort;
    notifyAccountSwitchSuccess(label);
  };

  return (
    <Pressable
      onPress={() => void handlePress()}
      disabled={isSwitching}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: `${colors.surfaceElevated}E6`,
          borderColor: `${colors.primary}33`,
          opacity: pressed || isSwitching ? 0.75 : 1,
        },
      ]}
      hitSlop={6}
      accessibilityLabel="Hesap değiştir"
      accessibilityHint={`${targetShort} hesabına geç`}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}14` }]}>
        <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
      </View>
      <Text variant="caption" style={[styles.label, { color: colors.text }]} numberOfLines={1}>
        {targetShort}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 168,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '700',
    fontSize: 12,
    flexShrink: 1,
  },
});
