import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { AccountLinkStatusCard } from '@/features/account-switch/components/AccountLinkStatusCard';
import { LinkAccountUsernamePicker } from '@/features/account-switch/components/LinkAccountUsernamePicker';
import { useAccountSwitch } from '@/features/account-switch/providers/AccountSwitchProvider';
import { linkSiblingAccountWithCredentials } from '@/features/account-switch/services/accountSwitch';
import { validateEmail, validatePassword } from '@/features/auth/services/validation';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function LinkBusinessAccountScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const {
    refreshSwitchState,
    linkedSibling,
    outgoingPendingUsername,
    outgoingPendingRequestId,
    outgoingPendingTargetUserId,
  } = useAccountSwitch();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accountType = profile?.account_type ?? 'personal';
  const isPersonal = accountType === 'personal';
  const expectedSiblingType = isPersonal ? 'business' : 'personal';

  useFocusEffect(
    useCallback(() => {
      void refreshSwitchState();
    }, [refreshSwitchState]),
  );

  const handleLink = async () => {
    setError(null);
    if (!user?.id) {
      setError('Oturum bulunamadı.');
      return;
    }
    if (linkedSibling) {
      setError('Zaten bağlı bir hesabınız var.');
      return;
    }
    if (outgoingPendingUsername) {
      setError('Zaten bekleyen bir bağlama isteğiniz var.');
      return;
    }

    if (!username.trim()) {
      setError('Bağlanacak hesabın kullanıcı adını girin.');
      return;
    }

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);
    const result = await linkSiblingAccountWithCredentials({
      currentUserId: user.id,
      currentAccountType: accountType,
      username,
      email,
      password,
    });
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    await refreshSwitchState();

    if (result.pendingApproval) {
      Alert.alert(
        'Onay gönderildi',
        `@${username.trim()} hesabına bağlama isteği iletildi. Karşı taraf bildirimlerinden tek seferlik onay verdiğinde hesaplar bağlanır.`,
        [{ text: 'Tamam', onPress: () => router.back() }],
      );
      return;
    }

    Alert.alert(
      'Hesap bağlandı',
      'Hesabınız bağlandı. Profil ekranındaki geçiş butonunu kullanabilirsiniz.',
      [{ text: 'Tamam', onPress: () => router.back() }],
    );
  };

  if (linkedSibling) {
    return (
      <GradientBackground>
        <ScrollView
          contentContainerStyle={[
            styles.page,
            { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
          ]}
        >
          <AuthHeader
            title={isPersonal ? 'İşletme Hesabını Bağla' : 'Bireysel Hesabı Bağla'}
            subtitle="Hesaplarınız bağlı"
            showBack
          />
          <AccountLinkStatusCard
            accountType={accountType}
            linkedSibling={linkedSibling}
            outgoingPendingUsername={null}
          />
        </ScrollView>
      </GradientBackground>
    );
  }

  if (outgoingPendingUsername) {
    return (
      <GradientBackground>
        <ScrollView
          contentContainerStyle={[
            styles.page,
            { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
          ]}
        >
          <AuthHeader
            title={isPersonal ? 'İşletme Hesabını Bağla' : 'Bireysel Hesabı Bağla'}
            subtitle="Onay bekleniyor"
            showBack
          />
          <AccountLinkStatusCard
            accountType={accountType}
            linkedSibling={null}
            outgoingPendingUsername={outgoingPendingUsername}
            outgoingPendingRequestId={outgoingPendingRequestId}
            outgoingPendingTargetUserId={outgoingPendingTargetUserId}
          />
          <GlassCard style={styles.infoCard}>
            <Ionicons name="notifications-outline" size={20} color={colors.primary} />
            <Text secondary variant="caption" style={styles.infoText}>
              Karşı taraf bildirimlerinden isteği onayladığında bağlantı tamamlanır. Onay sonrası profil
              Profil ekranındaki geçiş butonunu kullanarak hesap değiştirebilirsiniz.
            </Text>
          </GlassCard>
          <Button title="Panele dön" variant="secondary" onPress={() => router.back()} />
        </ScrollView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader
          title={isPersonal ? 'İşletme Hesabını Bağla' : 'Bireysel Hesabı Bağla'}
          subtitle={
            isPersonal
              ? 'Ayrı kayıt olmuş işletme hesabınızı bireysel hesabınıza bağlayın'
              : 'Ayrı kayıt olmuş bireysel hesabınızı işletme hesabınıza bağlayın'
          }
          showBack
        />

        <Text secondary variant="caption">
          Güvenlik için bağlamak istediğiniz hesabın e-posta ve şifresini girmeniz gerekir. Karşı taraf
          bildirimlerinden tek seferlik onay verir; onaydan sonra profilinizden hesap geçişi yapabilirsiniz.
        </Text>

        <LinkAccountUsernamePicker
          label={isPersonal ? 'İşletme Kullanıcı Adı' : 'Bireysel Kullanıcı Adı'}
          accountType={expectedSiblingType}
          excludeUserId={user?.id}
          value={username}
          onChangeText={setUsername}
          placeholder="İsim veya kullanıcı adı yazın…"
        />
        <Input
          label="Bağlanacak Hesabın E-postası"
          value={email}
          onChangeText={setEmail}
          placeholder="ornek@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Input
          label="Bağlanacak Hesabın Şifresi"
          value={password}
          onChangeText={setPassword}
          placeholder="Şifre"
          secureTextEntry
        />

        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

        <Button title="Bağlama İsteği Gönder" loading={loading} onPress={handleLink} />
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoText: { flex: 1 },
});
