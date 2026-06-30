import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { SiblingSessionSetupSheet } from '@/features/account-switch/components/SiblingSessionSetupSheet';
import { respondAccountLinkRequest } from '@/features/account-switch/services/accountLinkRequests';
import { hasStoredSiblingSession } from '@/features/account-switch/services/accountSwitch';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAccountSwitch } from '@/features/account-switch/providers/AccountSwitchProvider';

type Props = {
  requestId: string;
  requesterId?: string;
  onResolved: () => void;
};

export function AccountLinkRequestNotificationActions({ requestId, requesterId, onResolved }: Props) {
  const { colors } = useTheme();
  const { refreshSwitchState, linkedSibling } = useAccountSwitch();
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);

  const handleRespond = async (accept: boolean) => {
    setLoading(accept ? 'accept' : 'decline');
    const { error } = await respondAccountLinkRequest(requestId, accept);
    setLoading(null);

    if (error) {
      Alert.alert('İşlem başarısız', error);
      return;
    }

    if (accept) {
      await refreshSwitchState();
      const siblingId = requesterId ?? linkedSibling?.siblingId;
      const needsSetup = siblingId ? !(await hasStoredSiblingSession(siblingId)) : true;

      if (needsSetup) {
        Alert.alert(
          'Bağlantı onaylandı',
          'Hesaplar arası geçiş için kardeş hesabınızın şifresini bir kez girmeniz gerekiyor.',
          [
            { text: 'Sonra', style: 'cancel', onPress: onResolved },
            {
              text: 'Şimdi tamamla',
              onPress: () => {
                onResolved();
                setSetupOpen(true);
              },
            },
          ],
        );
        return;
      }

      Alert.alert('Hesap bağlandı', 'Profilinizden tek dokunuşla hesap değiştirebilirsiniz.', [
        { text: 'Tamam', onPress: onResolved },
      ]);
      return;
    }

    onResolved();
  };

  return (
    <>
      <View style={styles.row}>
        <Pressable
          onPress={() => void handleRespond(false)}
          disabled={loading !== null}
          style={({ pressed }) => [
            styles.btn,
            styles.decline,
            { borderColor: colors.border, opacity: pressed || loading ? 0.7 : 1 },
          ]}
        >
          {loading === 'decline' ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <Text variant="caption" style={{ fontWeight: '700', color: colors.textSecondary }}>
              Reddet
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => void handleRespond(true)}
          disabled={loading !== null}
          style={({ pressed }) => [
            styles.btn,
            styles.accept,
            { backgroundColor: colors.primary, opacity: pressed || loading ? 0.85 : 1 },
          ]}
        >
          {loading === 'accept' ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text variant="caption" style={{ fontWeight: '700', color: '#fff' }}>
              Onayla
            </Text>
          )}
        </Pressable>
      </View>
      <SiblingSessionSetupSheet visible={setupOpen} onClose={() => setSetupOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  btn: {
    flex: 1,
    minHeight: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  decline: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  accept: {},
});
