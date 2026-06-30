import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { ProfileScreen } from '@/features/profile/components/ProfileScreen';
import { getFloatingTabBarReserve } from '@/constants/tabBar';
import { spacing } from '@/constants/theme';
import { useStableTabBarInset } from '@/hooks/useStableTabBarInset';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

export function ProfileContent() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const tabBarBottomInset = useStableTabBarInset();
  const scrollBottomInset = getFloatingTabBarReserve(tabBarBottomInset) + spacing.md;

  if (user) {
    return <ProfileScreen userId={user.id} isOwnProfile reserveTabBarInset />;
  }

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[styles.page, { paddingBottom: scrollBottomInset }]}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="h2">Profil</Text>

        <GlassCard style={styles.guestCard}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
            <Ionicons name="log-in-outline" size={32} color={colors.primary} />
          </View>
          <Text variant="label">Giriş yapın</Text>
          <Text secondary variant="caption" style={styles.guestText}>
            Profilinizi görüntülemek ve paylaşım yapmak için hesabınıza giriş yapın.
          </Text>
          <View style={styles.guestActions}>
            <Button title="Giriş Yap" onPress={() => router.push('/(auth)/login')} />
            <Button title="Kayıt Ol" variant="outline" onPress={() => router.push('/(auth)/register')} />
          </View>
        </GlassCard>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md },
  guestCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestText: { textAlign: 'center' },
  guestActions: { gap: spacing.sm, marginTop: spacing.sm, width: '100%' },
});
