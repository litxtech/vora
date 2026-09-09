import { useEffect } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useShakeToComposeStore } from '@/features/compose/store/shakeToComposeStore';
import { useTheme } from '@/providers/ThemeProvider';

export function ShakeToComposeSettingsRow() {
  const { colors } = useTheme();
  const enabled = useShakeToComposeStore((s) => s.enabled);
  const hydrated = useShakeToComposeStore((s) => s.hydrated);
  const setEnabled = useShakeToComposeStore((s) => s.setEnabled);
  const hydrate = useShakeToComposeStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <View style={styles.row}>
      <Ionicons name="phone-portrait-outline" size={20} color={colors.text} />
      <View style={styles.meta}>
        <Text variant="body" style={styles.label}>
          Salla ve paylaş
        </Text>
        <Text variant="caption" secondary>
          Telefonu sallayarak metin gönderi ekranını aç
        </Text>
      </View>
      <Switch
        value={hydrated ? enabled : false}
        onValueChange={setEnabled}
        trackColor={{ true: colors.primary }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  label: {
    flex: 0,
  },
});
