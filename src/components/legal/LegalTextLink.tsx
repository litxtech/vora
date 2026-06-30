import { Pressable, Text as RNText } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { LEGAL_DOCUMENTS, type LegalSlug } from '@/constants/legal';
import { openUrl } from '@/lib/linking/openUrl';
import { useTheme } from '@/providers/ThemeProvider';

type LegalTextLinkProps = {
  slug: LegalSlug;
  label?: string;
  /** Paragraf içinde normal metin gibi altı çizili link */
  inline?: boolean;
};

export function LegalTextLink({ slug, label, inline = false }: LegalTextLinkProps) {
  const { colors } = useTheme();
  const doc = LEGAL_DOCUMENTS[slug];
  const text = label ?? doc.title;

  const openDocument = async () => {
    if (doc.publicUrl) {
      await openUrl(doc.publicUrl);
      return;
    }
    router.push({ pathname: '/(auth)/legal', params: { slug } });
  };

  const linkStyle = {
    color: colors.textSecondary,
    textDecorationLine: 'underline' as const,
    lineHeight: 20,
  };

  if (inline) {
    return (
      <RNText style={linkStyle} onPress={() => void openDocument()} accessibilityRole="link">
        {text}
      </RNText>
    );
  }

  return (
    <Pressable onPress={() => void openDocument()} accessibilityRole="link">
      <Text variant="caption" style={linkStyle}>
        {text}
      </Text>
    </Pressable>
  );
}
