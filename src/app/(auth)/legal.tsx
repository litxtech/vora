import { ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { LEGAL_DOCUMENTS, SUPPORT_EMAIL, type LegalSlug } from '@/constants/legal';
import { spacing } from '@/constants/theme';

export default function LegalScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const doc = LEGAL_DOCUMENTS[(slug as LegalSlug) ?? 'terms'] ?? LEGAL_DOCUMENTS.terms;

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll}>
        <AuthHeader title={doc.title} subtitle={doc.summary} />

        {doc.sections.map((section) => (
          <GlassCard key={section.heading} style={styles.section}>
            <Text variant="h3">{section.heading}</Text>
            <Text secondary style={styles.body}>
              {section.body}
            </Text>
          </GlassCard>
        ))}

        <GlassCard style={styles.section}>
          <Text variant="h3">Destek</Text>
          <Text secondary style={styles.body}>
            Sorularınız ve talepleriniz için {SUPPORT_EMAIL} adresinden bize ulaşabilirsiniz.
          </Text>
        </GlassCard>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  body: {
    lineHeight: 22,
  },
});
