import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import {
  LIFECYCLE_REQUEST_TYPE_LABELS,
  MIN_LIFECYCLE_MESSAGE_LENGTH,
  resolveDefaultRequestType,
} from '@/features/account-lifecycle/constants';
import {
  fetchMyPendingLifecycleRequest,
  submitAccountLifecycleRequest,
} from '@/features/account-lifecycle/services/lifecycleRequests';
import type { AccountAccessScenario } from '@/features/auth/types/accountAccessReview';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AccountLifecycleRequestPanelProps = {
  scenario: AccountAccessScenario;
};

export function AccountLifecycleRequestPanel({ scenario }: AccountLifecycleRequestPanelProps) {
  const { colors } = useTheme();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasPending, setHasPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const requestType = resolveDefaultRequestType(scenario);
  const canSubmit = message.trim().length >= MIN_LIFECYCLE_MESSAGE_LENGTH && !hasPending && !submitted;

  useEffect(() => {
    void fetchMyPendingLifecycleRequest().then(setHasPending);
  }, []);

  const handleSubmit = () => {
    Alert.alert(
      'Yönetime Bildir',
      'Talebiniz admin paneline iletilecek. Onaylıyor musunuz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Gönder',
          onPress: async () => {
            setLoading(true);
            const { error } = await submitAccountLifecycleRequest(requestType, message);
            setLoading(false);

            if (error) {
              Alert.alert('Hata', error);
              return;
            }

            setSubmitted(true);
            setHasPending(true);
            Alert.alert(
              'Talep iletildi',
              'Notunuz yönetim ekibine bildirim olarak gönderildi. En kısa sürede incelenecek.',
            );
          },
        },
      ],
    );
  };

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}14` }]}>
          <Ionicons name="chatbox-ellipses-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Text variant="label">Yönetime Talep Gönder</Text>
          <Text variant="caption" secondary>
            {LIFECYCLE_REQUEST_TYPE_LABELS[requestType]} — admin panelinden yanıtlanır
          </Text>
        </View>
      </View>

      {hasPending || submitted ? (
        <View style={[styles.notice, { backgroundColor: `${colors.success}12`, borderColor: `${colors.success}33` }]}>
          <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
          <Text variant="caption" style={{ color: colors.textSecondary, flex: 1 }}>
            Bekleyen talebiniz admin paneline iletildi. Yönetim ekibi inceledikten sonra size bildirim gönderilir.
          </Text>
        </View>
      ) : (
        <>
          <Input
            label="Mesajınız"
            value={message}
            onChangeText={setMessage}
            placeholder="Talebinizi kısaca açıklayın…"
            multiline
            numberOfLines={4}
            style={{ minHeight: 96, textAlignVertical: 'top' }}
          />
          <Text variant="caption" muted>
            En az {MIN_LIFECYCLE_MESSAGE_LENGTH} karakter. Gönderince tüm adminlere bildirim gider. Her aşamada (alındı, işlemde, sonuç) bildirim alırsınız.
          </Text>
          <Button
            title="Yönetime Gönder"
            loading={loading}
            disabled={!canSubmit}
            onPress={handleSubmit}
          />
        </>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
});
