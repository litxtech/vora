import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { VORA_AI_ACCENT } from '@/features/vora-ai/constants';
import { invokeVoraAi } from '@/features/vora-ai/services/voraAiClient';
import { useVoraAiModule } from '@/providers/VoraAiProvider';
import { radius, spacing } from '@/constants/theme';

const LONG_POST_THRESHOLD = 280;

type VoraAiPostSummaryProps = {
  postId: string;
  content: string;
  title?: string | null;
};

export function VoraAiPostSummary({ postId, content, title }: VoraAiPostSummaryProps) {
  const enabled = useVoraAiModule('posts');
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!enabled || content.length < LONG_POST_THRESHOLD) return null;

  const handleSummarize = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await invokeVoraAi({
        action: 'summarize',
        module: 'posts',
        context: { postId, content, title },
      });
      setSummary(result.text);
    } catch {
      setSummary('Özet şu an oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      {!summary ? (
        <Pressable
          style={[styles.btn, { backgroundColor: `${VORA_AI_ACCENT}15`, borderColor: `${VORA_AI_ACCENT}33` }]}
          onPress={handleSummarize}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={VORA_AI_ACCENT} />
          ) : (
            <>
              <Text style={styles.sparkle}>✨</Text>
              <Text variant="caption" style={{ color: VORA_AI_ACCENT, fontWeight: '700' }}>
                Özetle
              </Text>
            </>
          )}
        </Pressable>
      ) : (
        <View style={[styles.summary, { backgroundColor: `${VORA_AI_ACCENT}10` }]}>
          <Text variant="caption" style={{ fontWeight: '700', color: VORA_AI_ACCENT }}>Vora AI Özeti</Text>
          <Text variant="caption">{summary}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.xs },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sparkle: { fontSize: 12 },
  summary: {
    padding: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
});
