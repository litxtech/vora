import { useState, type RefObject } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type StoryReplyBarProps = {
  hasReacted: boolean;
  isOwnStory: boolean;
  sending?: boolean;
  onSend: (text: string) => Promise<void>;
  onToggleReaction: () => Promise<void>;
  onOpenInsights?: () => void;
  onDelete?: () => void;
  onInputFocus?: () => void;
  onInputBlur?: () => void;
  inputRef?: RefObject<TextInput | null>;
};

export function StoryReplyBar({
  hasReacted,
  isOwnStory,
  sending = false,
  onSend,
  onToggleReaction,
  onOpenInsights,
  onDelete,
  onInputFocus,
  onInputBlur,
  inputRef,
}: StoryReplyBarProps) {
  const { colors } = useTheme();
  const [text, setText] = useState('');

  if (isOwnStory) {
    return (
      <View style={styles.ownWrap}>
        <View style={styles.ownActions}>
          <Pressable style={styles.insightsPill} onPress={onOpenInsights} hitSlop={8}>
            <Ionicons name="chevron-up" size={18} color="#fff" />
            <Text variant="caption" style={styles.insightsLabel}>
              İstatistikler
            </Text>
          </Pressable>
          {onDelete ? (
            <Pressable style={styles.deletePill} onPress={onDelete} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
              <Text variant="caption" style={styles.deleteLabel}>
                Sil
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  const handleSend = async () => {
    const value = text.trim();
    if (!value || sending) return;
    setText('');
    await onSend(value);
  };

  return (
    <View style={styles.row}>
      <TextInput
        ref={inputRef}
        value={text}
        onChangeText={setText}
        placeholder="Hikayeye yanıt gönder…"
        placeholderTextColor="rgba(255,255,255,0.65)"
        style={styles.input}
        returnKeyType="send"
        onSubmitEditing={() => void handleSend()}
        onFocus={onInputFocus}
        onBlur={onInputBlur}
      />
      <Pressable style={styles.iconBtn} onPress={() => void onToggleReaction()} hitSlop={8}>
        <Ionicons name={hasReacted ? 'heart' : 'heart-outline'} size={26} color={hasReacted ? '#ff2d55' : '#fff'} />
      </Pressable>
      {text.trim() ? (
        <Pressable style={[styles.sendBtn, { backgroundColor: colors.primary }]} onPress={() => void handleSend()}>
          {sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  ownWrap: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  ownActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  insightsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  insightsLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  deletePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,107,107,0.16)',
  },
  deleteLabel: {
    color: '#ff8a8a',
    fontWeight: '700',
    fontSize: 13,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
