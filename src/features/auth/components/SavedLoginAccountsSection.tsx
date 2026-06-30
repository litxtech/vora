import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import type { SavedLoginAccount } from '@/features/auth/types/savedLoginAccounts';
import { useTheme } from '@/providers/ThemeProvider';

type SavedLoginAccountsSectionProps = {
  savedAccounts: SavedLoginAccount[];
  loginId: string;
  password: string;
  manualEntry: boolean;
  loading: boolean;
  error: string | null;
  onLoginIdChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSelectAccount: (account: SavedLoginAccount) => void;
  onUseManualEntry: () => void;
  onShowSavedAccounts: () => void;
  onForgetAccount: (loginId: string) => void;
  onSubmit: () => void;
};

function accountLabel(account: SavedLoginAccount): string {
  if (account.displayUsername) return `@${account.displayUsername}`;
  return account.loginId;
}

export function SavedLoginAccountsSection({
  savedAccounts,
  loginId,
  password,
  manualEntry,
  loading,
  error,
  onLoginIdChange,
  onPasswordChange,
  onSelectAccount,
  onUseManualEntry,
  onShowSavedAccounts,
  onForgetAccount,
  onSubmit,
}: SavedLoginAccountsSectionProps) {
  const { colors, isDark } = useTheme();
  const selectedAccount =
    !manualEntry && loginId
      ? (savedAccounts.find((item) => item.loginId === loginId) ?? null)
      : null;
  const showSavedPicker = savedAccounts.length > 0 && !manualEntry && !selectedAccount;

  return (
    <View style={styles.root}>
      {showSavedPicker ? (
        <View style={styles.savedPicker}>
          <Text secondary style={styles.savedPickerTitle}>
            Daha önce giriş yaptığınız hesaplar
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.savedRow}
            keyboardShouldPersistTaps="handled"
          >
            {savedAccounts.map((account) => (
              <Pressable
                key={account.loginId}
                onPress={() => onSelectAccount(account)}
                style={({ pressed }) => [
                  styles.savedCard,
                  {
                    borderColor: isDark ? 'rgba(255,255,255,0.12)' : colors.border,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.background,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${accountLabel(account)} ile giriş yap`}
              >
                <ProfileAvatar
                  username={account.displayUsername ?? account.loginId}
                  avatarUrl={account.avatarUrl}
                  size={72}
                />
                <Text variant="caption" numberOfLines={2} style={styles.savedCardLabel}>
                  {accountLabel(account)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable onPress={onUseManualEntry} hitSlop={8} style={styles.manualLink}>
            <Text variant="caption" style={{ color: colors.primary }}>
              Başka hesap kullan
            </Text>
          </Pressable>
        </View>
      ) : null}

      {selectedAccount ? (
        <View style={styles.selectedAccount}>
          <ProfileAvatar
            username={selectedAccount.displayUsername ?? selectedAccount.loginId}
            avatarUrl={selectedAccount.avatarUrl}
            size={96}
          />
          <Text variant="h3" style={styles.selectedLabel}>
            {accountLabel(selectedAccount)}
          </Text>
          <Text secondary variant="caption">
            Devam etmek için şifrenizi girin
          </Text>
        </View>
      ) : null}

      {selectedAccount && savedAccounts.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.switcherRow}
          keyboardShouldPersistTaps="handled"
        >
          {savedAccounts.map((account) => {
            const isActive = account.loginId === selectedAccount.loginId;
            return (
              <Pressable
                key={account.loginId}
                onPress={() => onSelectAccount(account)}
                style={({ pressed }) => [
                  styles.switcherItem,
                  {
                    opacity: pressed ? 0.85 : isActive ? 1 : 0.55,
                    borderColor: isActive ? colors.primary : 'transparent',
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${accountLabel(account)} hesabına geç`}
              >
                <ProfileAvatar
                  username={account.displayUsername ?? account.loginId}
                  avatarUrl={account.avatarUrl}
                  size={52}
                />
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {manualEntry || selectedAccount ? (
        <View style={styles.form}>
          {manualEntry ? (
            <Input
              value={loginId}
              onChangeText={onLoginIdChange}
              placeholder="Mail veya kullanıcı adı"
              autoCapitalize="none"
              autoComplete="username"
              keyboardType="email-address"
            />
          ) : null}
          <Input
            label="Şifre"
            value={password}
            onChangeText={onPasswordChange}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="password"
            autoFocus={Boolean(selectedAccount)}
          />

          {error ? (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: `${colors.danger}14`, borderColor: `${colors.danger}33` },
              ]}
            >
              <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
              <Text variant="caption" style={{ color: colors.danger, flex: 1 }}>
                {error}
              </Text>
            </View>
          ) : null}

          <Button title="Giriş Yap" loading={loading} onPress={onSubmit} />

          {selectedAccount ? (
            <View style={styles.selectedActions}>
              <Pressable onPress={() => onForgetAccount(selectedAccount.loginId)} hitSlop={8}>
                <Text variant="caption" style={{ color: colors.textMuted }}>
                  Bu hesabı unut
                </Text>
              </Pressable>
              {savedAccounts.length > 1 ? (
                <>
                  <Text variant="caption" muted>
                    •
                  </Text>
                  <Pressable onPress={onShowSavedAccounts} hitSlop={8}>
                    <Text variant="caption" style={{ color: colors.primary }}>
                      Başka hesap
                    </Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          ) : manualEntry && savedAccounts.length > 0 ? (
            <Pressable onPress={onShowSavedAccounts} hitSlop={8} style={styles.manualLink}>
              <Text variant="caption" style={{ color: colors.primary }}>
                Kayıtlı hesaplara dön
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  savedPicker: {
    gap: spacing.sm,
  },
  savedPickerTitle: {
    textAlign: 'center',
  },
  savedRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  savedCard: {
    width: 108,
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  savedCardLabel: {
    textAlign: 'center',
    minHeight: 32,
  },
  manualLink: {
    alignSelf: 'center',
  },
  selectedAccount: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  switcherRow: {
    gap: spacing.sm,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  switcherItem: {
    borderRadius: radius.full,
    borderWidth: 2,
    padding: 2,
  },
  selectedLabel: {
    textAlign: 'center',
  },
  form: {
    gap: spacing.md,
  },
  selectedActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
