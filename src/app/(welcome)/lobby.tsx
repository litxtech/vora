import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { StatBadge } from '@/components/ui/StatBadge';
import { Text } from '@/components/ui/Text';
import { LEGAL_DOCUMENTS } from '@/constants/legal';
import { radius, spacing } from '@/constants/theme';
import { useLobbyStats } from '@/features/auth/hooks/useLobbyStats';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export default function LobbyScreen() {
  const { colors } = useTheme();
  const { enterGuestMode } = useAuth();
  const { formatted } = useLobbyStats();

  const openLegal = (slug: string) => {
    router.push({ pathname: '/(auth)/legal', params: { slug } });
  };

  const continueAsGuest = async () => {
    await enterGuestMode();
    router.replace('/(tabs)');
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.logoRow}>
            <View style={[styles.logoIcon, { borderColor: colors.primary }]}>
              <Ionicons name="water" size={28} color={colors.primary} />
            </View>
            <View>
              <Text variant="h2">Vora</Text>
              <Text secondary>Canlı iletişim ve haber ağı</Text>
            </View>
          </View>
        </View>

        <GlassCard style={styles.statsCard}>
          <Text variant="label" secondary style={styles.statsTitle}>
            Canlı Platform
          </Text>
          <View style={styles.statsGrid}>
            <StatBadge value={formatted.activeUsers} label="aktif kullanıcı" />
            <StatBadge value={formatted.livePosts} label="canlı paylaşım" />
            <StatBadge value={formatted.jobListings} label="iş ilanı" />
            <StatBadge value={formatted.events} label="etkinlik" />
          </View>
        </GlassCard>

        <View style={styles.actions}>
          <Button title="Giriş Yap" onPress={() => router.push('/(auth)/login')} />
          <Button title="Kayıt Ol" variant="outline" onPress={() => router.push('/(auth)/register')} />
          <Button
            title="Şifremi Unuttum"
            variant="ghost"
            onPress={() => router.push('/(auth)/forgot-password')}
          />
          <Button title="Misafir Olarak Devam Et" variant="secondary" onPress={continueAsGuest} />
        </View>

        <View style={styles.legal}>
          <Pressable onPress={() => openLegal('terms')}>
            <Text variant="caption" style={{ color: colors.primary }}>
              {LEGAL_DOCUMENTS.terms.title}
            </Text>
          </Pressable>
          <Text variant="caption" muted>
            •
          </Text>
          <Pressable onPress={() => openLegal('privacy')}>
            <Text variant="caption" style={{ color: colors.primary }}>
              {LEGAL_DOCUMENTS.privacy.title}
            </Text>
          </Pressable>
          <Text variant="caption" muted>
            •
          </Text>
          <Pressable onPress={() => openLegal('child_protection')}>
            <Text variant="caption" style={{ color: colors.primary }}>
              {LEGAL_DOCUMENTS.child_protection.title}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  hero: {
    gap: spacing.md,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logoIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    backgroundColor: 'rgba(30, 136, 229, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsCard: {
    marginTop: spacing.sm,
  },
  statsTitle: {
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
  },
  legal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
