import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { BusinessRegisterForm } from '@/components/auth/BusinessRegisterForm';
import { PersonalRegisterForm } from '@/components/auth/PersonalRegisterForm';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type RegisterTab = 'personal' | 'business';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const [tab, setTab] = useState<RegisterTab>('personal');

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <AuthHeader
          title="Kayıt Ol"
          subtitle={tab === 'personal' ? 'Bireysel hesap — 18 yaş ve üzeri' : 'İşletme hesabı — belge yükleme zorunlu'}
        />

        <View style={styles.tabs}>
          {(['personal', 'business'] as RegisterTab[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[
                styles.tab,
                {
                  borderColor: tab === t ? colors.primary : colors.border,
                  backgroundColor: tab === t ? 'rgba(30,136,229,0.12)' : colors.surface,
                },
              ]}
            >
              <Text variant="caption" style={{ color: tab === t ? colors.primary : colors.textSecondary }}>
                {t === 'personal' ? 'Bireysel' : 'İşletme'}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'personal' ? <PersonalRegisterForm /> : <BusinessRegisterForm />}
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
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
});
