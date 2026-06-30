import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  FlatList,
  StyleSheet,
  View,
} from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { fetchConversationList } from '../services/conversationData';
import { sendSharedCard, type SharedCardMetadata } from '../services/shareCard';
import type { ConversationListItem } from '../types';
import { conversationAvatar, conversationTitle } from '../utils';

type ShareToChatSheetProps = {
  visible: boolean;
  senderId: string;
  card: SharedCardMetadata | null;
  onClose: () => void;
  onShared?: () => void;
};

export function ShareToChatSheet({
  visible,
  senderId,
  card,
  onClose,
  onShared,
}: ShareToChatSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    fetchConversationList()
      .then(setConversations)
      .finally(() => setLoading(false));
  }, [visible]);

  const shareTo = async (conversationId: string) => {
    if (!card) return;
    setBusyId(conversationId);
    const { error } = await sendSharedCard(conversationId, senderId, card);
    setBusyId(null);
    if (!error) {
      onShared?.();
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom, spacing.md),
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.header}>
            <Text variant="h3">Sohbete Paylaş</Text>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator
              renderItem={({ item }) => {
                const avatar = conversationAvatar(item);
                const title = conversationTitle(item);

                return (
                <Pressable
                  style={[styles.row, { borderColor: colors.border }]}
                  onPress={() => shareTo(item.id)}
                  disabled={busyId === item.id}
                >
                  <View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}>
                    {avatar ? (
                      <OptimizedImage
                        uri={avatar}
                        style={styles.avatarImage}
                        tier="avatar"
                        layoutWidth={44}
                        contentFit="cover"
                        recyclingKey={avatar}
                      />
                    ) : (
                      <Ionicons
                        name={item.type === 'group' ? 'people' : 'person'}
                        size={20}
                        color={colors.primary}
                      />
                    )}
                  </View>
                  <View style={styles.rowText}>
                    <Text variant="label" numberOfLines={1}>
                      {title}
                    </Text>
                    {item.lastMessagePreview ? (
                      <Text secondary variant="caption" numberOfLines={1}>
                        {item.lastMessagePreview}
                      </Text>
                    ) : null}
                  </View>
                  {busyId === item.id ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  )}
                </Pressable>
                );
              }}
              ListEmptyComponent={
                <Text secondary style={styles.empty}>
                  Henüz sohbet yok. Mesajlar sekmesinden yeni sohbet başlatın.
                </Text>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    height: '88%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.full,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  closeBtn: { padding: spacing.xs },
  loader: { marginTop: spacing.xl },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 44,
    height: 44,
  },
  rowText: { flex: 1, gap: 2 },
  empty: { textAlign: 'center', paddingVertical: spacing.xl },
});
