import { useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { AD_POLICY_META, AD_POLICY_SECTIONS } from '@/features/ads/constants/adPolicy';
import { markAdPolicySeen } from '@/features/ads/services/adPolicySeen';
import { SUPPORT_EMAIL } from '@/constants/legal';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export function AdPolicyScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  useEffect(() => {
    void markAdPolicySeen(user?.id);
  }, [user?.id]);

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader
          compact
          title={AD_POLICY_META.title}
          subtitle={`Sürüm ${AD_POLICY_META.version} · Güncelleme: ${AD_POLICY_META.lastUpdated}`}
        />

        <GlassCard style={styles.intro}>
          <Text secondary style={styles.body}>
            {AD_POLICY_META.summary}
          </Text>
          <Text secondary variant="caption" style={styles.note}>
            Bu belge Vora Reklam Merkezi kullanıcıları, reklam verenler ve platform moderasyon ekibi için bağlayıcıdır.
          </Text>
        </GlassCard>

        {AD_POLICY_SECTIONS.map((section) => (
          <GlassCard key={section.heading} style={styles.section}>
            <Text variant="h3">{section.heading}</Text>
            <Text secondary style={styles.body}>
              {section.body}
            </Text>
          </GlassCard>
        ))}

        <GlassCard style={styles.section}>
          <Text variant="h3">İletişim</Text>
          <Text secondary style={styles.body}>
            Reklam politikası, moderasyon kararları ve faturalama konularında {SUPPORT_EMAIL} adresinden bize
            ulaşabilirsiniz.
          </Text>
        </GlassCard>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  intro: { gap: spacing.sm },
  section: { gap: spacing.sm },
  body: { lineHeight: 22 },
  note: { lineHeight: 18, fontStyle: 'italic' },
});
