import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { searchConversationMessages } from '../services/messageExplore';
import type { ChatMessage } from '../types';
import { displayParticipantName, formatMessageTime } from '../utils';

type ChatSearchSheetProps = {
  visible: boolean;
  conversationId: string;
  userId: string;
  onClose: () => void;
  onSelectMessage: (message: ChatMessage) => void;
};

export function ChatSearchSheet({
  visible,
  conversationId,
  userId,
  onClose,
  onSelectMessage,
}: ChatSearchSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ChatMessage[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    inputRef.current?.blur();
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
      return;
    }
    const timer = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(timer);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });

    return () => sub.remove();
  }, [visible, handleClose]);

  useEffect(() => {
    if (!visible || !userId) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const found = await searchConversationMessages(conversationId, userId, q);
        setResults(found);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, visible, conversationId, userId]);

  const renderItem = ({ item }: { item: ChatMessage }) => (
    <Pressable
      style={[styles.row, { borderColor: colors.border }]}
      onPress={() => {
        onSelectMessage(item);
        handleClose();
      }}
    >
      <View style={styles.rowTop}>
        <Text variant="label" numberOfLines={1}>
          {displayParticipantName(item.sender)}
        </Text>
        <Text variant="caption" secondary>
          {formatMessageTime(item.createdAt)}
        </Text>
      </View>
      <Text secondary numberOfLines={2}>
        {item.content}
      </Text>
    </Pressable>
  );

  if (!visible) return null;

  return (
    <Modal
      visible
      animationType={resolveModalAnimationType('slide')}
      presentationStyle="fullScreen"
      statusBarTranslucent={Platform.OS === 'android'}
      onRequestClose={handleClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['bottom']}
      >
        <View
          style={[
            styles.topBar,
            {
              paddingTop: insets.top + spacing.sm,
              borderBottomColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <Pressable
              onPress={handleClose}
              hitSlop={12}
              style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 16 }}>İptal</Text>
            </Pressable>
            <Text variant="label" style={styles.headerTitle}>
              Mesajlarda ara
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <View
            style={[styles.searchWrap, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
          >
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.text }]}
              placeholder="Ara…"
              placeholderTextColor={colors.textSecondary}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery('')} hitSlop={10}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            ) : searching ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : null}
          </View>
        </View>

        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          renderItem={renderItem}
          ListEmptyComponent={
            <Text secondary style={styles.empty}>
              {query.trim().length < 2 ? 'En az 2 karakter yazın' : 'Sonuç bulunamadı'}
            </Text>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  cancelBtn: {
    minWidth: 56,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
  },
  headerSpacer: {
    minWidth: 56,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    minHeight: 36,
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
    flexGrow: 1,
  },
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
    gap: 4,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  empty: {
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
