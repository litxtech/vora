import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { ACCOUNT_SWITCH_ROUTES } from '@/features/account-switch/constants';
import { useAccountSwitch } from '@/features/account-switch/providers/AccountSwitchProvider';
import { notifyAccountSwitchSuccess } from '@/features/account-switch/services/accountSwitch';
import { SiblingSessionSetupSheet } from '@/features/account-switch/components/SiblingSessionSetupSheet';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function AccountSwitchBar() {
  const { colors } = useTheme();
  const {
    canSwitch,
    switchPreview,
    linkedSibling,
    outgoingPendingUsername,
    needsSiblingSessionSetup,
    isSwitching,
    switchAccount,
  } = useAccountSwitch();
  const [setupOpen, setSetupOpen] = useState(false);

  if (!linkedSibling && !outgoingPendingUsername) return null;

  const handleSwitch = async () => {
    const result = await switchAccount();
    if (result.needsReauth) {
      setSetupOpen(true);
      return;
    }
    if (result.error) {
      Alert.alert('Hesap değişimi', result.error);
      return;
    }
    if (switchPreview) {
      notifyAccountSwitchSuccess(switchPreview.title.replace(' geç', ''));
    }
  };

  if (outgoingPendingUsername) {
    return (
      <CompactChip
        icon="hourglass-outline"
        label="Onay bekleniyor"
        accent={colors.warning}
        onPress={() => router.push(ACCOUNT_SWITCH_ROUTES.linkBusinessAccount as Href)}
      />
    );
  }

  if (needsSiblingSessionSetup && linkedSibling) {
    return (
      <>
        <CompactChip
          icon="key-outline"
          label="Şifre doğrula"
          accent={colors.warning}
          onPress={() => setSetupOpen(true)}
        />
        <SiblingSessionSetupSheet
          visible={setupOpen}
          onClose={() => setSetupOpen(false)}
          onComplete={() => void handleSwitch()}
        />
      </>
    );
  }

  if (!switchPreview || !canSwitch) return null;

  const accent = switchPreview.target.mode === 'business' ? '#7C4DFF' : colors.primary;
  const shortTitle =
    switchPreview.target.kind === 'session'
      ? switchPreview.target.mode === 'business'
        ? 'İşletmeye geç'
        : 'Bireysele geç'
      : switchPreview.target.mode === 'business'
        ? 'İşletme görünümü'
        : 'Bireysel görünüm';

  return (
    <>
      <Pressable
        onPress={() => void handleSwitch()}
        disabled={isSwitching}
        style={({ pressed }) => [{ opacity: pressed || isSwitching ? 0.82 : 1 }]}
      >
        <View style={[styles.chip, { borderColor: `${accent}40`, backgroundColor: `${accent}10` }]}>
          {linkedSibling && switchPreview.target.kind === 'session' ? (
            <ProfileAvatar
              username={linkedSibling.username}
              avatarUrl={linkedSibling.avatarUrl}
              size={22}
            />
          ) : (
            <Ionicons
              name={switchPreview.target.mode === 'business' ? 'storefront-outline' : 'person-outline'}
              size={14}
              color={accent}
            />
          )}
          {isSwitching ? (
            <ActivityIndicator size="small" color={accent} />
          ) : (
            <Text variant="caption" style={[styles.label, { color: accent }]}>
              {shortTitle}
            </Text>
          )}
          <Ionicons name="swap-horizontal" size={13} color={accent} />
        </View>
      </Pressable>
      <SiblingSessionSetupSheet
        visible={setupOpen}
        onClose={() => setSetupOpen(false)}
        onComplete={() => void handleSwitch()}
      />
    </>
  );
}

function CompactChip({
  icon,
  label,
  accent,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  accent: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1 }]}>
      <View style={[styles.chip, { borderColor: `${accent}40`, backgroundColor: `${accent}10` }]}>
        <Ionicons name={icon} size={14} color={accent} />
        <Text variant="caption" style={[styles.label, { color: accent }]}>
          {label}
        </Text>
        <Ionicons name="chevron-forward" size={12} color={accent} style={{ opacity: 0.7 }} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 140,
  },
});
