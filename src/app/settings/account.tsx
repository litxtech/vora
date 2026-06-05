import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { validatePassword } from '@/features/auth/services/validation';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export default function AccountSettingsScreen() {
  const { colors } = useTheme();
  const { profile, changePassword, updateAccountStatus, requestAccountDeletion, cancelAccountDeletion, signOut } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    setLoading(true);
    const { error: changeError } = await changePassword(newPassword);
    setLoading(false);

    if (changeError) {
      setError(changeError);
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    Alert.alert('Başarılı', 'Şifreniz güncellendi.');
  };

  const handleFreezeAccount = () => {
    Alert.alert(
      'Hesabı Dondur',
      'Hesabınız dondurulduğunda profiliniz gizlenir ve giriş yapamazsınız. Devam etmek istiyor musunuz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Dondur',
          style: 'destructive',
          onPress: async () => {
            const { error: freezeError } = await updateAccountStatus('frozen');
            if (freezeError) {
              Alert.alert('Hata', freezeError);
              return;
            }
            await signOut();
            router.replace('/(welcome)/lobby');
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Hesabı Sil',
      'Kalıcı silme talebi oluşturulacak. 30 gün içinde giriş yaparak iptal edebilirsiniz. Verilerinizi indirmek için destek ile iletişime geçebilirsiniz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Silme Talebi Oluştur',
          style: 'destructive',
          onPress: async () => {
            const { error: deleteError } = await requestAccountDeletion();
            if (deleteError) {
              Alert.alert('Hata', deleteError);
              return;
            }
            await signOut();
            router.replace('/(welcome)/lobby');
          },
        },
      ],
    );
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <AuthHeader title="Hesap Güvenliği" subtitle="Şifre, dondurma ve silme işlemleri" />

        {profile?.account_status === 'deletion_pending' ? (
          <GlassCard style={styles.section}>
            <Text style={{ color: colors.warning }}>
              Hesabınız için kalıcı silme talebi oluşturuldu. 30 gün içinde iptal edebilirsiniz.
            </Text>
            <Button
              title="Silme Talebini İptal Et"
              variant="secondary"
              onPress={async () => {
                const { error: cancelError } = await cancelAccountDeletion();
                if (cancelError) {
                  Alert.alert('Hata', cancelError);
                  return;
                }
                Alert.alert('Başarılı', 'Hesap silme talebiniz iptal edildi.');
              }}
            />
          </GlassCard>
        ) : null}

        <GlassCard style={styles.section}>
          <Text variant="h3">Şifre Değiştir</Text>
          <Input label="Yeni Şifre" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
          <Input label="Yeni Şifre Tekrar" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
          {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
          <Button title="Şifreyi Güncelle" loading={loading} onPress={handleChangePassword} />
        </GlassCard>

        <GlassCard style={styles.section}>
          <Text variant="h3">Veri İndirme</Text>
          <Text secondary>
            Hesap verilerinizin bir kopyasını talep etmek için destek ekibimizle iletişime geçebilirsiniz.
          </Text>
          <Button title="Veri İndirme Talebi" variant="secondary" onPress={() => Alert.alert('Bilgi', 'Talebiniz destek ekibine iletilecek.')} />
        </GlassCard>

        <GlassCard style={styles.section}>
          <Text variant="h3">Hesap Yönetimi</Text>
          <Text secondary variant="caption">
            Yeni cihaz girişlerinde e-posta bildirimi gönderilir. Şüpheli aktivite tespit edildiğinde oturumunuz korunur.
          </Text>
          <Button title="Hesabı Dondur" variant="secondary" onPress={handleFreezeAccount} />
          <Button title="Hesabı Kalıcı Sil" variant="danger" onPress={handleDeleteAccount} />
        </GlassCard>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.md,
  },
});
