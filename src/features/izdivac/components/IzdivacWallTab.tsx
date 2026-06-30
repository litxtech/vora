import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { IzdivacPostCard } from '@/features/izdivac/components/IzdivacPostCard';
import { IzdivacWallComposer } from '@/features/izdivac/components/IzdivacWallComposer';
import { IZDIVAC_ACCENT } from '@/features/izdivac/constants';
import { useIzdivacWall } from '@/features/izdivac/hooks/useIzdivacWall';
import type { IzdivacPost } from '@/features/izdivac/types';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function IzdivacWallTab() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { posts, loading, error, refresh, setPosts } = useIzdivacWall();

  const patchPost = (postId: string, patch: Partial<IzdivacPost>) => {
    setPosts((prev) => prev.map((p) => (p.postId === postId ? { ...p, ...patch } : p)));
  };

  const removePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.postId !== postId));
  };

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.postId}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={IZDIVAC_ACCENT} />}
      ListHeaderComponent={<IzdivacWallComposer onPosted={() => void refresh()} />}
      ListEmptyComponent={
        loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={IZDIVAC_ACCENT} />
          </View>
        ) : (
          <View style={[styles.empty, { borderColor: colors.border }]}>
            <Text secondary variant="caption" style={{ textAlign: 'center' }}>
              Henüz paylaşım yok. İlk daveti siz oluşturun.
            </Text>
          </View>
        )
      }
      renderItem={({ item }) => (
        <IzdivacPostCard
          post={item}
          currentUserId={user?.id}
          onUpdate={(patch) => patchPost(item.postId, patch)}
          onDelete={() => removePost(item.postId)}
        />
      )}
      ListFooterComponent={
        error ? (
          <Text variant="caption" style={{ color: colors.danger, textAlign: 'center' }}>
            {error}
          </Text>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm, paddingBottom: spacing.xl, flexGrow: 1 },
  center: { paddingVertical: spacing.xl, alignItems: 'center' },
  empty: {
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderRadius: 12,
    marginTop: spacing.md,
  },
});
