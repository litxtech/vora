import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type StoryReplyBarProps = {
  hasReacted: boolean;
  isOwnStory: boolean;
  sending?: boolean;
  onSend: (text: string) => Promise<void>;
  onToggleReaction: () => Promise<void>;
  onOpenInsights?: () => void;
};

export function StoryReplyBar({
  hasReacted,
  isOwnStory,
  sending = false,
  onSend,
  onToggleReaction,
  onOpenInsights,
}: StoryReplyBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');

  if (isOwnStory) {
    return (
      <View style={[styles.ownRow, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Pressable style={styles.insightsBtn} onPress={onOpenInsights}>
          <Ionicons name="bar-chart-outline" size={18} color="#fff" />
        </Pressable>
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
    <View style={[styles.row, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Hikayeye yanıt gönder…"
        placeholderTextColor="rgba(255,255,255,0.65)"
        style={styles.input}
        returnKeyType="send"
        onSubmitEditing={() => void handleSend()}
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
  },
  ownRow: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
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
  insightsBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
