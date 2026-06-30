import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import {
  ACCOUNT_DELETION_CONFIRM_PHRASE,
  ACCOUNT_DELETION_GRACE_DAYS,
  ACCOUNT_DELETION_LEGAL_NOTICE,
} from '@/features/account-deletion/constants';
import { formatDeletedAccountDate } from '@/features/account-deletion/utils';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function DeleteAccountSection() {
  const { colors } = useTheme();
  const { profile, requestAccountDeletion, cancelAccountDeletion, signOut } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const canConfirm = confirmText.trim().toUpperCase() === ACCOUNT_DELETION_CONFIRM_PHRASE;
  const isPending = profile?.account_status === 'deletion_pending';

  const scheduledDeletionDate = useMemo(() => {
    if (!profile?.deletion_requested_at) return null;
    const date = new Date(profile.deletion_requested_at);
    date.setDate(date.getDate() + ACCOUNT_DELETION_GRACE_DAYS);
    return formatDeletedAccountDate(date.toISOString());
  }, [profile?.deletion_requested_at]);

  const handleDeleteRequest = () => {
    Alert.alert(
      'Hesabı Kalıcı Sil',
      `7 gün içinde tüm verileriniz geri dönüşsüz silinecektir. Bu süre içinde giriş yaparak iptal edebilirsiniz.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Silme Talebini Onayla',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const { error } = await requestAccountDeletion();
            setLoading(false);

            if (error) {
              Alert.alert('Hata', error);
              return;
            }

            setConfirmText('');
            await signOut('deletion');
            router.replace('/(welcome)/lobby');
          },
        },
      ],
    );
  };

  if (isPending) {
    return (
      <GlassCard style={styles.section}>
        <Text variant="h3" style={{ color: colors.warning }}>
          Hesap Silme Talebi Aktif
        </Text>
        <Text secondary>
          Hesabınız {scheduledDeletionDate ?? `7 gün içinde`} tarihine kadar kalıcı olarak silinecek.
        </Text>
        <View style={[styles.notice, { backgroundColor: `${colors.warning}12`, borderColor: `${colors.warning}33` }]}>
          <Text variant="caption" style={{ color: colors.warning }}>
            {ACCOUNT_DELETION_LEGAL_NOTICE}
          </Text>
        </View>
        <Button
          title="Silme Talebini İptal Et"
          variant="secondary"
          loading={loading}
          onPress={async () => {
            setLoading(true);
            const { error } = await cancelAccountDeletion();
            setLoading(false);
            if (error) {
              Alert.alert('Hata', error);
              return;
            }
            Alert.alert('Başarılı', 'Hesap silme talebiniz iptal edildi.');
          }}
        />
      </GlassCard>
    );
  }

  return (
    <GlassCard style={styles.section}>
      <Text variant="h3" style={{ color: colors.danger }}>
        Hesap Silme
      </Text>
      <View style={[styles.notice, { backgroundColor: `${colors.danger}10`, borderColor: `${colors.danger}28` }]}>
        <Text variant="label" style={{ color: colors.danger }}>
          Kurumsal Bilgilendirme
        </Text>
        <Text secondary variant="caption">
          {ACCOUNT_DELETION_LEGAL_NOTICE}
        </Text>
        <Text secondary variant="caption">
          Mesaj geçmişinizdeki yazışmalar karşı tarafta görünür kalabilir; ancak profiliniz ve kimliğiniz
          uygulama genelinde kaldırılır. Profil resminiz hiçbir yerde gösterilmez.
        </Text>
      </View>

      <Text secondary variant="caption">
        Onaylamak için aşağıya <Text style={{ fontWeight: '700', color: colors.text }}>{ACCOUNT_DELETION_CONFIRM_PHRASE}</Text> yazın.
      </Text>
      <Input
        label="Onay Metni"
        value={confirmText}
        onChangeText={setConfirmText}
        autoCapitalize="characters"
        placeholder={ACCOUNT_DELETION_CONFIRM_PHRASE}
      />

      <Button
        title="Hesabı Kalıcı Sil"
        variant="danger"
        disabled={!canConfirm}
        loading={loading}
        onPress={handleDeleteRequest}
      />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  notice: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
});
