import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { FeedPostCard } from '@/features/feed/components/FeedPostCard';
import type { FeedItem } from '@/features/feed/types';
import {
  createCollection,
  fetchSaveCollections,
  fetchSavedPostsByCollection,
  type SaveCollection,
} from '@/features/profile/services/savedPosts';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type UseSavedCollectionsOptions = {
  enabled?: boolean;
};

export function useSavedCollections(userId: string, options?: UseSavedCollectionsOptions) {
  const enabled = options?.enabled ?? true;
  const [collections, setCollections] = useState<SaveCollection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [collectionName, setCollectionName] = useState('');

  const loadCollections = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    const cols = await fetchSaveCollections(userId);
    setCollections(cols);
    setLoading(false);
  }, [enabled, userId]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void loadCollections();
  }, [enabled, loadCollections]);

  useEffect(() => {
    if (!enabled) return;
    setPostsLoading(true);
    fetchSavedPostsByCollection(userId, selectedId)
      .then(setPosts)
      .finally(() => setPostsLoading(false));
  }, [enabled, userId, selectedId]);

  const handleCreate = async () => {
    if (!collectionName.trim()) return;
    const { error } = await createCollection(userId, collectionName.trim());
    if (!error) {
      setCollectionName('');
      setShowInput(false);
      await loadCollections();
    }
  };

  const updatePost = useCallback((id: string, patch: Partial<FeedItem>) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  return {
    collections,
    selectedId,
    setSelectedId,
    posts,
    loading,
    postsLoading,
    showInput,
    setShowInput,
    collectionName,
    setCollectionName,
    handleCreate,
    updatePost,
  };
}

type SavedCollectionsToolbarProps = {
  collections: SaveCollection[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  showInput: boolean;
  onToggleInput: () => void;
  collectionName: string;
  onCollectionNameChange: (name: string) => void;
  onCreate: () => void;
};

export function SavedCollectionsToolbar({
  collections,
  selectedId,
  onSelect,
  showInput,
  onToggleInput,
  collectionName,
  onCollectionNameChange,
  onCreate,
}: SavedCollectionsToolbarProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.toolbar}>
      <View style={styles.chips}>
        <Pressable
          onPress={() => onSelect(null)}
          style={[
            styles.chip,
            {
              borderColor: selectedId === null ? colors.primary : colors.border,
              backgroundColor: selectedId === null ? 'rgba(30,136,229,0.12)' : colors.surface,
            },
          ]}
        >
          <Text variant="caption" style={{ color: selectedId === null ? colors.primary : colors.textSecondary }}>
            Tümü
          </Text>
        </Pressable>
        {collections.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => onSelect(c.id)}
            style={[
              styles.chip,
              {
                borderColor: selectedId === c.id ? colors.primary : colors.border,
                backgroundColor: selectedId === c.id ? 'rgba(30,136,229,0.12)' : colors.surface,
              },
            ]}
          >
            <Text variant="caption" style={{ color: selectedId === c.id ? colors.primary : colors.textSecondary }}>
              {c.name} ({c.postCount})
            </Text>
          </Pressable>
        ))}
        <Pressable
          onPress={onToggleInput}
          style={[styles.chip, { borderColor: colors.border, borderStyle: 'dashed' }]}
        >
          <Text variant="caption" style={{ color: colors.primary }}>
            + Koleksiyon
          </Text>
        </Pressable>
      </View>

      {showInput ? (
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            placeholder="Koleksiyon adı"
            placeholderTextColor={colors.textMuted}
            value={collectionName}
            onChangeText={onCollectionNameChange}
          />
          <Pressable onPress={onCreate} style={[styles.createBtn, { backgroundColor: colors.primary }]}>
            <Text variant="caption" style={{ color: '#fff' }}>
              Oluştur
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

type SavedCollectionsTabProps = {
  userId: string;
};

export function SavedCollectionsTab({ userId }: SavedCollectionsTabProps) {
  const { colors } = useTheme();
  const saved = useSavedCollections(userId);

  if (saved.loading) return <ActivityIndicator color={colors.primary} />;

  return (
    <FlatList
      data={saved.posts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <FeedPostCard item={item} onUpdate={(patch) => saved.updatePost(item.id, patch)} />
      )}
      ListHeaderComponent={
        <SavedCollectionsToolbar
          collections={saved.collections}
          selectedId={saved.selectedId}
          onSelect={saved.setSelectedId}
          showInput={saved.showInput}
          onToggleInput={() => saved.setShowInput((v) => !v)}
          collectionName={saved.collectionName}
          onCollectionNameChange={saved.setCollectionName}
          onCreate={() => void saved.handleCreate()}
        />
      }
      ListEmptyComponent={
        saved.postsLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text secondary style={styles.empty}>
            Bu koleksiyonda kayıtlı gönderi yok.
          </Text>
        )
      }
      scrollEnabled={false}
      initialNumToRender={5}
      windowSize={7}
      removeClippedSubviews
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  toolbar: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  inputRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  createBtn: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  empty: { textAlign: 'center', paddingVertical: spacing.lg },
});
