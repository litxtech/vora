import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { openUrl } from '@/lib/linking/openUrl';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { CHAT_GALLERY_PAGE_SIZE } from '../constants';
import {
  extractLinks,
  fetchGalleryMessagesPage,
  resolveGalleryThumbnailUrl,
  type MediaGalleryTab,
} from '../services/messageExplore';
import type { ChatMessage } from '../types';
import { displayParticipantName, formatMessageTime, parseFileContent } from '../utils';

const TABS: { id: MediaGalleryTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'media', label: 'Medya', icon: 'image-outline' },
  { id: 'videos', label: 'Videolar', icon: 'videocam-outline' },
  { id: 'files', label: 'Dosyalar', icon: 'document-outline' },
  { id: 'links', label: 'Linkler', icon: 'link-outline' },
];

type ChatMediaGalleryProps = {
  visible: boolean;
  conversationId: string;
  userId: string;
  onClose: () => void;
  onSelectMessage?: (message: ChatMessage) => void;
};

export function ChatMediaGallery({
  visible,
  conversationId,
  userId,
  onClose,
  onSelectMessage,
}: ChatMediaGalleryProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const gridGap = 3;
  const cellSize = (width - spacing.md * 2 - gridGap * 2) / 3;

  const [tab, setTab] = useState<MediaGalleryTab>('media');
  const [items, setItems] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const offsetRef = useRef(0);

  const loadPage = useCallback(
    async (reset: boolean) => {
      if (!visible || !userId) return;

      if (reset) {
        setLoading(true);
        offsetRef.current = 0;
      } else {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
      }

      try {
        const page = await fetchGalleryMessagesPage(
          conversationId,
          userId,
          tab,
          reset ? 0 : offsetRef.current,
          CHAT_GALLERY_PAGE_SIZE,
        );

        setItems((prev) => {
          if (reset) return page.items;
          const seen = new Set(prev.map((m) => m.id));
          const unique = page.items.filter((m) => !seen.has(m.id));
          return [...prev, ...unique];
        });
        setHasMore(page.hasMore);
        offsetRef.current = reset ? page.items.length : offsetRef.current + page.items.length;
        setTotalLoaded((prev) => (reset ? page.items.length : prev + page.items.length));
      } catch {
        if (reset) {
          setItems([]);
          setHasMore(false);
          setTotalLoaded(0);
        }
      } finally {
        if (reset) setLoading(false);
        else setLoadingMore(false);
      }
    },
    [visible, userId, conversationId, tab, loadingMore, hasMore],
  );

  useEffect(() => {
    if (!visible) return;
    void loadPage(true);
  }, [visible, conversationId, userId, tab]);

  const loadMore = useCallback(() => {
    void loadPage(false);
  }, [loadPage]);

  const activeTab = TABS.find((t) => t.id === tab);

  const selectMessage = useCallback(
    (item: ChatMessage) => {
      onClose();
      requestAnimationFrame(() => {
        onSelectMessage?.(item);
      });
    },
    [onClose, onSelectMessage],
  );

  const renderGridItem = ({ item }: { item: ChatMessage }) => {
    const thumbnailUrl = resolveGalleryThumbnailUrl(item);

    return (
      <Pressable
        style={[styles.gridCell, { width: cellSize, height: cellSize }]}
        onPress={() => selectMessage(item)}
      >
        {thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} style={styles.gridImage} resizeMode="cover" />
        ) : (
          <View style={[styles.gridPlaceholder, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons
              name={tab === 'videos' ? 'videocam-outline' : 'image-outline'}
              size={22}
              color={colors.textMuted}
            />
          </View>
        )}
        {tab === 'videos' ? (
          <View style={styles.playOverlay}>
            <Ionicons name="play" size={14} color="#fff" />
          </View>
        ) : null}
      </Pressable>
    );
  };

  const renderFileItem = ({ item }: { item: ChatMessage }) => {
    const file = parseFileContent(item.content);
    const isAudio = item.messageType === 'audio';
    return (
      <Pressable
        style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => selectMessage(item)}
      >
        <View style={[styles.listIcon, { backgroundColor: `${colors.primary}14` }]}>
          <Ionicons
            name={isAudio ? 'musical-notes-outline' : 'document-outline'}
            size={18}
            color={colors.primary}
          />
        </View>
        <View style={styles.listInfo}>
          <Text variant="caption" numberOfLines={1} style={{ fontWeight: '600' }}>
            {file?.name ?? (isAudio ? 'Ses kaydı' : 'Dosya')}
          </Text>
          <Text variant="caption" secondary numberOfLines={1}>
            {displayParticipantName(item.sender)} · {formatMessageTime(item.createdAt)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
      </Pressable>
    );
  };

  const renderLinkItem = ({ item }: { item: ChatMessage }) => {
    const links = extractLinks(item.content);
    const url = links[0] ?? item.content;
    return (
      <Pressable
        style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => selectMessage(item)}
      >
        <View style={[styles.listIcon, { backgroundColor: `${colors.accent}14` }]}>
          <Ionicons name="link-outline" size={18} color={colors.accent} />
        </View>
        <View style={styles.listInfo}>
          <Text variant="caption" numberOfLines={2} style={{ color: colors.primary, fontWeight: '500' }}>
            {url}
          </Text>
          <Text variant="caption" secondary numberOfLines={1}>
            {displayParticipantName(item.sender)} · {formatMessageTime(item.createdAt)}
          </Text>
        </View>
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            void openUrl(url);
          }}
          hitSlop={8}
        >
          <Ionicons name="open-outline" size={14} color={colors.textMuted} />
        </Pressable>
      </Pressable>
    );
  };

  const listFooter = loadingMore ? (
    <ActivityIndicator color={colors.primary} style={styles.loadMore} />
  ) : null;

  const isGrid = tab === 'media' || tab === 'videos';

  return (
    <Modal visible={visible} animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
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
            <View style={styles.headerCenter}>
              <Text variant="label" style={{ fontWeight: '700' }}>Medya Galerisi</Text>
              {!loading ? (
                <Text variant="caption" secondary style={styles.countText}>
                  {totalLoaded}
                  {hasMore ? '+' : ''} {activeTab?.label.toLowerCase()}
                </Text>
              ) : null}
            </View>
            <Pressable
              style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}
              onPress={onClose}
              hitSlop={10}
            >
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <Pressable
                  key={t.id}
                  style={[
                    styles.tab,
                    active
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: 'transparent' },
                  ]}
                  onPress={() => setTab(t.id)}
                >
                  <Ionicons
                    name={t.icon}
                    size={11}
                    color={active ? '#fff' : colors.textMuted}
                  />
                  <Text
                    numberOfLines={1}
                    style={{
                      color: active ? '#fff' : colors.textSecondary,
                      fontWeight: active ? '600' : '400',
                      fontSize: 10,
                    }}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={colors.primary} size="small" />
          </View>
        ) : isGrid ? (
          <FlatList
            key={`gallery-grid-${tab}`}
            data={items}
            keyExtractor={(item) => item.id}
            numColumns={3}
            columnWrapperStyle={[styles.gridRow, { gap: gridGap }]}
            contentContainerStyle={styles.gridList}
            renderItem={renderGridItem}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={listFooter}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name={activeTab?.icon ?? 'image-outline'} size={32} color={colors.textMuted} />
                <Text secondary style={styles.empty}>Henüz içerik yok</Text>
              </View>
            }
          />
        ) : (
          <FlatList
            key={`gallery-list-${tab}`}
            data={items}
            keyExtractor={(item) => item.id}
            numColumns={1}
            contentContainerStyle={styles.listContent}
            renderItem={tab === 'links' ? renderLinkItem : renderFileItem}
            ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={listFooter}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name={activeTab?.icon ?? 'document-outline'} size={32} color={colors.textMuted} />
                <Text secondary style={styles.empty}>Henüz içerik yok</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  headerCenter: {
    flex: 1,
    gap: 1,
  },
  countText: {
    fontSize: 11,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 2,
    gap: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 5,
    paddingHorizontal: 2,
    borderRadius: radius.sm - 2,
    minHeight: 26,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMore: {
    paddingVertical: spacing.md,
  },
  gridList: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  gridRow: {
    marginBottom: 3,
  },
  gridCell: {
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listInfo: {
    flex: 1,
    gap: 2,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.sm,
  },
  empty: {
    textAlign: 'center',
    fontSize: 13,
  },
});
