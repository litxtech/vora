import { ScrollView, StyleSheet } from 'react-native';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { FriendInvitePanel } from '@/features/profile/components/FriendInvitePanel';
import { ProfileQuickLink } from '@/features/profile/components/shared/ProfileQuickLink';
import {
  REFERRAL_INVITED_BY_ROUTE,
  REFERRAL_ROUTE,
} from '@/features/referral-earnings/constants';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function InviteCenterScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { refreshProfile } = useAuth();

  return (
    <GradientBackground>
      <AuthHeader title="Davet Merkezi" subtitle="Davet et, kazan" showBack />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={styles.section}>
          <Text variant="label">Senin davet kodun</Text>
          <Text secondary variant="caption">
            Kodunu paylaş; arkadaşın girdiğinde ikiniz de güven puanı kazanırsınız. Kod her
            kullanımdan sonra otomatik olarak yenilenir.
          </Text>
          <FriendInvitePanel onPointsEarned={() => void refreshProfile?.()} />
        </GlassCard>

        <ProfileQuickLink
          icon="cash-outline"
          title="Hakediş"
          subtitle="Davet ettiklerin ve kazançların"
          accent={colors.success}
          onPress={() => router.push(REFERRAL_ROUTE as Href)}
        />
        <ProfileQuickLink
          icon="person-add-outline"
          title="Beni Davet Eden"
          subtitle="Sana verilen kodu gir, davet ilişkini kur"
          accent={colors.primary}
          onPress={() => router.push(REFERRAL_INVITED_BY_ROUTE as Href)}
        />
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  section: { gap: spacing.sm },
});
