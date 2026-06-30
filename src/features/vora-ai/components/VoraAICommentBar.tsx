import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardPersistButton } from '@/components/keyboard';
import { Text } from '@/components/ui/Text';
import { VORA_AI_ACCENT, VORA_AI_COMMENT_PROMPTS } from '@/features/vora-ai/constants';
import { invokeVoraAi } from '@/features/vora-ai/services/voraAiClient';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { toUserFacingError } from '@/lib/errors';

type VoraAICommentBarProps = {
  postId?: string;
  reelId?: string;
  mediaUrls?: string[];
  disabled?: boolean;
  onCommentPosted?: () => void;
};

export function VoraAICommentBar({
  postId,
  reelId,
  mediaUrls,
  disabled,
  onCommentPosted,
}: VoraAICommentBarProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [commentPosted, setCommentPosted] = useState(false);

  const hasMedia = (mediaUrls?.length ?? 0) > 0;

  const runQuery = async (
    action: 'ask' | 'observe',
    queryText?: string,
    asComment = false,
  ) => {
    if (loading) return;
    setLoading(true);
    setAnswer(null);
    setCommentPosted(false);
    try {
      const result = await invokeVoraAi({
        action,
        module: 'comments',
        context: {
          postId,
          reelId,
          question: queryText,
          mediaUrls,
          postAsComment: asComment,
        },
      });
      setAnswer(result.text);
      if (result.commentPosted) {
        setCommentPosted(true);
        onCommentPosted?.();
      }
    } catch (e) {
      setAnswer(toUserFacingError(e instanceof Error ? e.message : null, { fallback: 'Yanıt alınamadı.' }));
    } finally {
      setLoading(false);
    }
  };

  const handleAsk = () => {
    const q = question.trim();
    if (!q) return;
    void runQuery('ask', q, false);
  };

  const handlePostAsComment = () => {
    const q = question.trim();
    void runQuery(q ? 'ask' : 'observe', q || undefined, true);
  };

  if (disabled || (!postId && !reelId)) return null;

  return (
    <View style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
      <Pressable style={styles.toggle} onPress={() => setExpanded((v) => !v)}>
        <Text style={styles.sparkle}>✨</Text>
        <Ionicons name="sparkles" size={14} color={VORA_AI_ACCENT} />
        <Text variant="caption" style={{ color: VORA_AI_ACCENT, fontWeight: '700' }}>
          Vora AI {hasMedia ? '— Görsel & Video' : ''}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.textMuted}
          style={styles.chevron}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {VORA_AI_COMMENT_PROMPTS.map((prompt) => (
              <Pressable
                key={prompt.id}
                style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={() => {
                  if (prompt.action === 'observe') {
                    void runQuery('observe');
                  } else {
                    setQuestion(prompt.question);
                    void runQuery('ask', prompt.question);
                  }
                }}
                disabled={loading}
              >
                <Text variant="caption" style={styles.chipLabel}>
                  {prompt.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder={hasMedia ? 'Görsel veya video hakkında sor...' : 'Bu otel nasıl? Bu yer neresi?'}
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
            multiline
            submitBehavior="submit"
            returnKeyType="send"
            enterKeyHint="send"
            blurOnSubmit={false}
            onSubmitEditing={handlePostAsComment}
          />

          <View style={styles.actions}>
            <KeyboardPersistButton
              onPress={handlePostAsComment}
              style={[styles.secondaryBtn, { borderColor: colors.border }]}
              disabled={loading}
              accessibilityLabel="Yorum olarak paylaş"
            >
              {loading ? (
                <ActivityIndicator color={VORA_AI_ACCENT} size="small" />
              ) : (
                <>
                  <Ionicons name="chatbubble-outline" size={14} color={VORA_AI_ACCENT} />
                  <Text variant="caption" style={{ color: VORA_AI_ACCENT, fontWeight: '600' }}>
                    Yorum olarak paylaş
                  </Text>
                </>
              )}
            </KeyboardPersistButton>
            <KeyboardPersistButton
              onPress={handleAsk}
              style={[styles.askBtn, { backgroundColor: VORA_AI_ACCENT }]}
              disabled={loading || !question.trim()}
              accessibilityLabel="Sor"
            >
              {loading ? (
                <ActivityIndicator color="#0A0E14" size="small" />
              ) : (
                <Text variant="caption" style={styles.askLabel}>Sor</Text>
              )}
            </KeyboardPersistButton>
          </View>

          {commentPosted ? (
            <Text variant="caption" style={{ color: VORA_AI_ACCENT, fontWeight: '600' }}>
              ✓ Vora AI yorumu paylaşıldı
            </Text>
          ) : null}

          {answer ? (
            <View style={[styles.answer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text variant="caption">{answer}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  sparkle: { fontSize: 12 },
  chevron: { marginLeft: 'auto' },
  body: { paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, gap: spacing.sm },
  chips: { gap: spacing.xs, paddingBottom: spacing.xs },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chipLabel: { fontWeight: '600' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
    minHeight: 44,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 32,
  },
  askBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    minWidth: 56,
    alignItems: 'center',
  },
  askLabel: { color: '#0A0E14', fontWeight: '700' },
  answer: {
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
