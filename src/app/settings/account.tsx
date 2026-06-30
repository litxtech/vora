import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { AccountDataExportCard } from '@/features/account-data-export';
import { DeleteAccountSection } from '@/features/account-deletion';
import { validatePassword } from '@/features/auth/services/validation';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export default function AccountSettingsScreen() {
  const { colors } = useTheme();
  const { changePassword, requestAccountFreeze, signOut } = useAuth();
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
            const { error: freezeError } = await requestAccountFreeze();
            if (freezeError) {
              Alert.alert('Hata', freezeError);
              return;
            }
            await signOut('frozen');
            router.replace('/(welcome)/lobby');
          },
        },
      ],
    );
  };

  return (
    <GradientBackground>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        bottomOffset={32}
        extraKeyboardSpace={24}
      >
        <AuthHeader title="Hesap Güvenliği" subtitle="Şifre, dondurma ve silme işlemleri" showBack />

        <Button title="Güven Merkezi" variant="outline" onPress={() => router.push('/settings/security' as never)} />
        <Button title="Mesajlaşma Gizliliği" variant="outline" onPress={() => router.push('/settings/messaging' as never)} />

        <GlassCard style={styles.section}>
          <Text variant="h3">Şifre Değiştir</Text>
          <Input label="Yeni Şifre" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
          <Input label="Yeni Şifre Tekrar" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
          {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
          <Button title="Şifreyi Güncelle" loading={loading} onPress={handleChangePassword} />
        </GlassCard>

        <AccountDataExportCard />

        <GlassCard style={styles.section}>
          <Text variant="h3">Hesap Yönetimi</Text>
          <Text secondary variant="caption">
            Oturumunuz yalnızca siz çıkış yaptığınızda, hesabınız banlandığında veya silme talebi oluşturduğunuzda sonlanır.
          </Text>
          <Button title="Hesabı Dondur" variant="secondary" onPress={handleFreezeAccount} />
        </GlassCard>

        <DeleteAccountSection />
      </KeyboardAwareScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.md,
  },
});
