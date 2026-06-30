import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFormField } from '@/features/admin/components/shared/AdminFormField';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { AdminUserSearchPicker } from '@/features/admin/components/shared/AdminUserSearchPicker';
import {
  adminPinPost,
  adminUnpinPost,
  adminUpdatePostPin,
  fetchPinnedPostsAdmin,
  fetchUserPostsAdmin,
  type AdminUserPostRow,
  type PinnedPostRow,
} from '@/features/admin/services/feedCurationManagement';
import type { AdminUserRow } from '@/features/admin/types';
import {
  formatPinExpiry,
  isPinActive,
  PIN_DURATION_OPTIONS,
  type PinDurationOption,
} from '@/features/feed/services/postPinning';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function AdminFeedCurationScreen() {
  const { colors } = useTheme();
  const [items, setItems] = useState<PinnedPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [priorityInput, setPriorityInput] = useState('0');

  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [userPosts, setUserPosts] = useState<AdminUserPostRow[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState<AdminUserPostRow | null>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setItems(await fetchPinnedPostsAdmin());
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const loadUserPosts = useCallback(async (authorId: string) => {
    setPostsLoading(true);
    setUserPosts(await fetchUserPostsAdmin(authorId));
    setPostsLoading(false);
  }, []);

  useEffect(() => {
    setSelectedPost(null);
    if (!selectedUser) {
      setUserPosts([]);
      return;
    }
    void loadUserPosts(selectedUser.id);
  }, [selectedUser, loadUserPosts]);

  const handlePin = (option: PinDurationOption) => {
    if (!selectedPost) {
      Alert.alert('Gönderi seç', 'Önce sabitlenecek gönderiyi seçin.');
      return;
    }
    const postId = selectedPost.id;
    const priority = Math.max(0, parseInt(priorityInput, 10) || 0);
    Alert.alert(
      'Gönderiyi Sabitle',
      option.days
        ? `@${selectedUser?.username} kullanıcısının gönderisi ${option.days} gün boyunca akışın üstünde gösterilsin mi?`
        : `@${selectedUser?.username} kullanıcısının gönderisi süresiz olarak akışın üstünde gösterilsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sabitle',
          onPress: async () => {
            setActionId(postId);
            const { error } = await adminPinPost(postId, option.days, priority);
            setActionId(null);
            if (error) Alert.alert('Hata', error);
            else {
              setSelectedPost(null);
              if (selectedUser) void loadUserPosts(selectedUser.id);
              await load(true);
            }
          },
        },
      ],
    );
  };

  const handleUnpin = (item: PinnedPostRow) => {
    Alert.alert('Sabitlemeyi Kaldır', 'Bu gönderi akış üstünden kaldırılsın mı?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: async () => {
          setActionId(item.post_id);
          const { error } = await adminUnpinPost(item.post_id);
          setActionId(null);
          if (error) Alert.alert('Hata', error);
          else {
            if (selectedUser) void loadUserPosts(selectedUser.id);
            await load(true);
          }
        },
      },
    ]);
  };

  const handleExtend = (item: PinnedPostRow, option: PinDurationOption) => {
    Alert.alert('Süreyi Güncelle', `${option.label} olarak güncellensin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Güncelle',
        onPress: async () => {
          setActionId(item.post_id);
          const { error } = await adminUpdatePostPin(item.post_id, option.days);
          setActionId(null);
          if (error) Alert.alert('Hata', error);
          else await load(true);
        },
      },
    ]);
  };

  return (
    <AdminShell
      title="Gönderi Sabitleme"
      subtitle="Kullanıcı bul, gönderisini seç ve akışın üstüne sabitle"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <GlassCard style={styles.card}>
        <View style={styles.stepHeader}>
          <View style={[styles.stepBadge, { backgroundColor: `${colors.primary}22` }]}>
            <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
              1
            </Text>
          </View>
          <Text variant="label">Kullanıcı seç</Text>
        </View>
        <AdminUserSearchPicker selectedUser={selectedUser} onSelectUser={setSelectedUser} />
      </GlassCard>

      {selectedUser ? (
        <GlassCard style={styles.card}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepBadge, { backgroundColor: `${colors.primary}22` }]}>
              <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                2
              </Text>
            </View>
            <Text variant="label">Gönderi seç</Text>
          </View>

          {postsLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text variant="caption" secondary>
                Gönderiler yükleniyor…
              </Text>
            </View>
          ) : userPosts.length === 0 ? (
            <Text variant="caption" secondary style={styles.muted}>
              Bu kullanıcının yayınlanmış gönderisi bulunamadı.
            </Text>
          ) : (
            <View style={styles.postList}>
              {userPosts.map((post) => {
                const isSelected = selectedPost?.id === post.id;
                const thumb = post.media_urls?.[0];
                const pinnedActive = post.is_pinned && isPinActive(post.pinned_until);
                return (
                  <Pressable key={post.id} onPress={() => setSelectedPost(isSelected ? null : post)}>
                    <View
                      style={[
                        styles.postRow,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? `${colors.primary}12` : `${colors.surface}66`,
                        },
                      ]}
                    >
                      {thumb ? (
                        <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" />
                      ) : (
                        <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: `${colors.textMuted}1f` }]}>
                          <Ionicons name="document-text-outline" size={20} color={colors.textMuted} />
                        </View>
                      )}
                      <View style={styles.postCopy}>
                        <Text variant="label" numberOfLines={1}>
                          {post.title?.trim() || post.content.slice(0, 60) || 'Başlıksız gönderi'}
                        </Text>
                        <Text secondary variant="caption" numberOfLines={1}>
                          {new Date(post.created_at).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                          {' · '}
                          {post.view_count.toLocaleString('tr-TR')} görüntülenme · {post.like_count} beğeni
                        </Text>
                        {pinnedActive ? (
                          <View style={styles.pinnedTag}>
                            <Ionicons name="pin" size={11} color={colors.success} />
                            <Text variant="caption" style={{ color: colors.success }}>
                              Şu an sabitli
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={isSelected ? colors.primary : colors.textMuted}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </GlassCard>
      ) : null}

      {selectedPost ? (
        <GlassCard style={styles.card}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepBadge, { backgroundColor: `${colors.primary}22` }]}>
              <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                3
              </Text>
            </View>
            <Text variant="label">Sabitleme süresi</Text>
          </View>
          <Text secondary variant="caption" numberOfLines={2}>
            {selectedPost.title?.trim() || selectedPost.content.slice(0, 80) || 'Seçili gönderi'}
          </Text>
          <AdminFormField
            label="Öncelik (yüksek = üstte)"
            value={priorityInput}
            onChangeText={setPriorityInput}
            placeholder="0"
          />
          <View style={styles.chipRow}>
            {PIN_DURATION_OPTIONS.map((option) => (
              <AdminActionChip
                key={option.id}
                label={option.label}
                icon="pin-outline"
                tone="primary"
                loading={actionId === selectedPost.id}
                disabled={Boolean(actionId)}
                onPress={() => handlePin(option)}
              />
            ))}
          </View>
        </GlassCard>
      ) : null}

      <View style={styles.listHeader}>
        <Text variant="label">Sabitli gönderiler</Text>
        {!loading ? (
          <Text variant="caption" secondary>
            {items.length}
          </Text>
        ) : null}
      </View>

      {loading ? (
        <AdminEmptyState loading />
      ) : items.length === 0 ? (
        <AdminEmptyState
          title="Sabitleme yok"
          message="Henüz akışta sabitlenmiş gönderi bulunmuyor."
          icon="pin-outline"
        />
      ) : (
        items.map((item) => (
          <GlassCard key={item.post_id} style={styles.row}>
            <Text variant="label" numberOfLines={1}>
              {item.title?.trim() || item.content.slice(0, 60)}
            </Text>
            <Text secondary variant="caption">
              @{item.author_username} · {item.view_count.toLocaleString('tr-TR')} görüntülenme · Öncelik{' '}
              {item.pin_priority}
            </Text>
            <Text secondary variant="caption">
              Sabitleyen: @{item.pinned_by_username ?? '—'} · Bitiş: {formatPinExpiry(item.pinned_until)}
            </Text>
            <View style={styles.chipRow}>
              {PIN_DURATION_OPTIONS.map((option) => (
                <AdminActionChip
                  key={`${item.post_id}-${option.id}`}
                  label={option.label}
                  icon="time-outline"
                  tone="primary"
                  loading={actionId === item.post_id}
                  disabled={Boolean(actionId)}
                  onPress={() => handleExtend(item, option)}
                />
              ))}
              <AdminActionChip
                label="Kaldır"
                icon="close-circle-outline"
                tone="danger"
                loading={actionId === item.post_id}
                disabled={Boolean(actionId)}
                onPress={() => handleUnpin(item)}
              />
            </View>
          </GlassCard>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.md },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  muted: { paddingVertical: spacing.xs },
  postList: { gap: spacing.xs },
  postRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  thumb: { width: 48, height: 48, borderRadius: radius.sm },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  postCopy: { flex: 1, gap: 2 },
  pinnedTag: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  row: { gap: spacing.sm, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
